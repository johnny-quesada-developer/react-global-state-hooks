import fs from 'node:fs';
import path from 'node:path';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { createConcurrentLoop } from '../../graph/createConcurrentLoop';
import { createSequentialLoop } from '../../graph/createSequentialLoop';
import type { Rule, RuleReport, RuleRunParams } from '../../segments/rules/Rule';
import { scoreInBatches } from '../../segments/rules/scoring';
import { annotateFailure } from '../../shared/annotateFailure';
import { createResultCache, type ResultCache } from '../../shared/resultCache';
import { rememberChoices } from '../../shared/reviewConfig';
import { findOwningPackageRoot } from '../../shared/workspace';
import { buildCoverageReport } from './buildCoverageReport';
import { buildQualityScoreSystemPrompt, buildQualityScoreUserPrompt } from './prompts/testQualityPrompts';
import { captureTestMetadata } from './steps/captureTestMetadata';
import { findUntestableReason } from './steps/discardUntestableFiles';
import { homologateFileDomain } from './steps/homologateFileDomain';
import { increaseFileCoverage } from './steps/increaseCoverageLoop';
import { inspectTestFile } from './steps/inspectTestFile';
import { measureFileCoverage, type TestMetadata } from './steps/measureFileCoverage';
import { QualityReviewSchema, readBlockingFlags, reviewTestQuality } from './steps/reviewTestQualityLoop';
import { chooseTestSuffix, findDedicatedTestFile, type TestSuffix } from './steps/testNaming';
import {
  coverageFromCache,
  isPending,
  meetsGoal,
  trackFile,
  type TestCoverageOptions,
  type TrackedFile,
} from './TrackedFile';

const RULE_ID = 'test-coverage';
const RULE_TITLE = 'Increase test coverage with quality tests';

const CoverageRuleState = Annotation.Root({
  params: Annotation<RuleRunParams>(),
  options: Annotation<TestCoverageOptions>(),
  files: Annotation<TrackedFile[]>(),
  metadataByProject: Annotation<Record<string, TestMetadata>>(),
  testSuffix: Annotation<TestSuffix | undefined>(),
  cache: Annotation<ResultCache>(),
  report: Annotation<RuleReport | undefined>(),
});
type State = typeof CoverageRuleState.State;

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const concurrencyOf = ({ context }: RuleRunParams) =>
  context.options.concurrency ?? context.projectConfig.agent.concurrency;

const inDifferentFolders = (left: TrackedFile, right: TrackedFile) =>
  path.dirname(left.sourcePath) !== path.dirname(right.sourcePath);

async function forEachPendingFile({
  params,
  files,
  label,
  shouldProcess = isPending,
  process,
}: {
  params: RuleRunParams;
  files: TrackedFile[];
  label: string;
  shouldProcess?: (file: TrackedFile) => boolean;
  process: (file: TrackedFile) => Promise<TrackedFile>;
}): Promise<TrackedFile[]> {
  const loop = createConcurrentLoop<TrackedFile, TrackedFile>({
    name: label,
    concurrency: concurrencyOf(params),
    canRunTogether: inDifferentFolders,
    processItem: async (file) => {
      if (!shouldProcess(file)) return file;
      try {
        return await process(file);
      } catch (error) {
        return { ...file, status: 'unprocessable', reason: `${label} failed: ${errorMessage(error)}` };
      }
    },
  });
  return loop.run(files);
}

const cacheKeyFor = ({ cache, file, goal }: { cache: ResultCache; file: TrackedFile; goal: number }) =>
  cache.keyFor({
    files: [file.sourcePath, file.testPath ?? findDedicatedTestFile(file.sourcePath) ?? ''].filter(Boolean),
    extra: `goal:${goal}`,
  });

const askOptions = async ({ params }: State) => {
  const { ask, options } = params.context;
  const goal =
    options.goal ??
    (await ask.number({ message: 'Desired line coverage per file (%)', defaultValue: 80, min: 1, max: 100 }));
  const maxCoverageAttempts =
    options.maxCoverageAttempts ??
    (await ask.number({
      message: 'Max agent attempts to reach coverage per file',
      defaultValue: 3,
      min: 1,
      max: 10,
    }));
  const maxQualityAttempts =
    options.maxQualityAttempts ??
    (await ask.number({
      message: 'Max agent attempts to fix test quality per file',
      defaultValue: 2,
      min: 0,
      max: 10,
    }));
  params.logger.detail(
    `goal ${goal}% · coverage attempts ${maxCoverageAttempts} · quality attempts ${maxQualityAttempts} · concurrency ${concurrencyOf(params)}`,
  );
  rememberChoices({
    workspaceRoot: params.context.workspaceRoot,
    patch: {
      coverage: {
        goal,
        maxCoverageAttempts,
        maxQualityAttempts,
        testSuffix: options.testSuffix as 'test' | 'spec' | undefined,
      },
    },
  });
  return {
    options: { goal, maxCoverageAttempts, maxQualityAttempts },
    metadataByProject: {},
    cache: createResultCache({ reviewDirectory: params.context.run.reviewDirectory, ruleId: RULE_ID }),
  };
};

const discardUntestableFiles = ({ params }: State) => {
  const { workspaceRoot } = params.context;
  const files = params.files.map((file) => {
    const tracked = trackFile({ file, projectRoot: findOwningPackageRoot({ file, workspaceRoot }) });
    const untestableReason = findUntestableReason(file);
    return untestableReason
      ? { ...tracked, status: 'notTestable' as const, reason: untestableReason }
      : tracked;
  });
  const discardedCount = files.filter(({ status }) => status === 'notTestable').length;
  params.logger.step(
    `discarded ${discardedCount} non-testable file(s), ${files.length - discardedCount} left`,
  );
  return { files };
};

const skipUnchangedPasses = ({ params, files, options, cache }: State) => {
  const relative = (file: string) => path.relative(params.context.workspaceRoot, file);
  const skipped = files.map((file) => {
    if (!isPending(file)) return file;
    const cached = cache.readPass<{ lines: number }>(cacheKeyFor({ cache, file, goal: options.goal }));
    if (!cached) return file;
    params.logger.success(`${relative(file.sourcePath)}: passed in a previous run and is unchanged (cache)`);
    const coverage = coverageFromCache(cached.lines);
    return {
      ...file,
      status: 'alreadyCovered' as const,
      reason: `passed in a previous run at ${cached.lines}%, unchanged since (cache)`,
      initialCoverage: coverage,
      latestCoverage: coverage,
    };
  });
  return { files: skipped };
};

const captureMetadataPerProject = async ({ params, files }: State) => {
  const { workspaceRoot, run } = params.context;
  const pendingProjects = [...new Set(files.filter(isPending).map(({ projectRoot }) => projectRoot))];
  const metadataByProject: Record<string, TestMetadata> = {};
  const failures: Record<string, string> = {};

  const projectsLoop = createSequentialLoop<string, void>({
    name: 'capture-metadata',
    processItem: async (projectRoot) => {
      const sampleSourceFile = files.find(
        (file) => isPending(file) && file.projectRoot === projectRoot,
      )!.sourcePath;
      params.logger.step(`capturing test metadata for ${path.relative(workspaceRoot, projectRoot)}`);
      try {
        metadataByProject[projectRoot] = await captureTestMetadata({
          workspaceRoot,
          projectRoot,
          sampleSourceFile,
          provider: params.provider,
          logger: params.logger,
          run,
        });
      } catch (error) {
        failures[projectRoot] = errorMessage(error);
      }
    },
  });
  await projectsLoop.run(pendingProjects);

  const withMetadataFailures = files.map((file) => {
    const failure = isPending(file) ? failures[file.projectRoot] : undefined;
    return failure ? { ...file, status: 'unprocessable' as const, reason: failure } : file;
  });
  return { metadataByProject, files: withMetadataFailures };
};

const measureInitialCoverage = async ({ params, files, metadataByProject, options }: State) => {
  const measuredFiles = await forEachPendingFile({
    params,
    files,
    label: 'initial coverage',
    process: async (file) => {
      const coverage = await measureFileCoverage({
        metadata: metadataByProject[file.projectRoot],
        sourcePath: file.sourcePath,
        run: params.context.run,
      });
      const relativePath = path.relative(params.context.workspaceRoot, file.sourcePath);
      const measured = { ...file, initialCoverage: coverage, latestCoverage: coverage };

      if (meetsGoal({ coverage, goal: options.goal })) {
        params.logger.success(`${relativePath}: ${coverage.lines}% already meets ${options.goal}%`);
        return { ...measured, status: 'alreadyCovered' as const, reason: `already at ${coverage.lines}%` };
      }

      const existingTestFile = findDedicatedTestFile(file.sourcePath);
      params.logger.info(
        `${relativePath}: ${coverage.lines}% < ${options.goal}% · ${existingTestFile ? 'has a test file' : 'needs a new test file'}`,
      );
      return { ...measured, testPath: existingTestFile, needsNewTestFile: !existingTestFile };
    },
  });
  return { files: measuredFiles };
};

const needsNewTestFiles = ({ files }: State) =>
  files.some((file) => isPending(file) && file.needsNewTestFile);

const chooseNaming = async ({ params, files, options }: State) => {
  const projectRoots = [
    ...new Set(
      files.filter((file) => isPending(file) && file.needsNewTestFile).map(({ projectRoot }) => projectRoot),
    ),
  ];
  const testSuffix = await chooseTestSuffix({
    projectRoots,
    ask: params.context.ask,
    requestedSuffix: params.context.options.testSuffix,
  });
  rememberChoices({
    workspaceRoot: params.context.workspaceRoot,
    patch: { coverage: { ...options, testSuffix } },
  });
  return { testSuffix };
};

const homologateFileDomains = async ({ params, files, metadataByProject, testSuffix }: State) => {
  const { workspaceRoot, run } = params.context;
  const relative = (file: string) => path.relative(workspaceRoot, file);
  const homologatedFiles = await forEachPendingFile({
    params,
    files,
    label: 'homologation',
    shouldProcess: (file) => isPending(file) && file.needsNewTestFile,
    process: async (file) => {
      const metadata = metadataByProject[file.projectRoot];
      const result = await homologateFileDomain({
        sourcePath: file.sourcePath,
        suffix: testSuffix!,
        metadata,
        workspaceRoot,
      });

      if (result.unprocessableReason) {
        params.logger.error(`${relative(file.sourcePath)}: ${result.unprocessableReason}`);
        return { ...file, status: 'unprocessable' as const, reason: result.unprocessableReason };
      }

      const wasMoved = result.sourcePath !== file.sourcePath;
      if (wasMoved)
        params.logger.success(`moved ${relative(file.sourcePath)} → ${relative(result.sourcePath)}`);
      result.referenceUpdates.forEach(({ file: referencingFile, line, after }) =>
        params.logger.detail(`updated reference ${relative(referencingFile)}:${line} → ${after}`),
      );
      params.logger.success(`test file ready: ${relative(result.testPath)}`);

      const baseline = await measureFileCoverage({ metadata, sourcePath: result.sourcePath, run });
      return {
        ...file,
        sourcePath: result.sourcePath,
        testPath: result.testPath,
        latestCoverage: baseline,
        changedFiles: [...file.changedFiles, ...result.changedFiles],
        notes: wasMoved
          ? [
              ...file.notes,
              `homologated into ${relative(path.dirname(result.sourcePath))}/ (${result.referenceUpdates.length} reference(s) updated)`,
            ]
          : file.notes,
      };
    },
  });
  return { files: homologatedFiles };
};

const increaseCoverage = async ({ params, files, metadataByProject, options }: State) => {
  const { workspaceRoot, run } = params.context;
  const coveredFiles = await forEachPendingFile({
    params,
    files,
    label: 'coverage loop',
    process: (file) =>
      increaseFileCoverage({
        file,
        metadata: metadataByProject[file.projectRoot],
        options,
        provider: params.provider,
        workspaceRoot,
        logger: params.logger.child(path.relative(workspaceRoot, file.sourcePath)),
        run,
      }),
  });
  return { files: coveredFiles };
};

const isReadyForQuality = (file: TrackedFile) => file.status === 'improved' && Boolean(file.testPath);

const scoreQualityInBatches = async ({ params, files }: State) => {
  const { workspaceRoot, projectConfig } = params.context;
  const scorable = files.filter(
    (file) => isReadyForQuality(file) && readBlockingFlags(file.testPath!).length === 0,
  );
  if (scorable.length < 2) return {};

  params.logger.step(
    `pre-scoring test quality for ${scorable.length} file(s) in batches of ${projectConfig.agent.scoreBatchSize}`,
  );
  const reviews = await scoreInBatches({
    provider: params.provider,
    task: 'score-test-quality',
    systemPrompt: buildQualityScoreSystemPrompt(),
    items: scorable.map((file) => ({
      file: path.relative(workspaceRoot, file.testPath!),
      section: buildQualityScoreUserPrompt({
        workspaceRoot,
        sourcePath: file.sourcePath,
        testPath: file.testPath!,
        signals: inspectTestFile(fs.readFileSync(file.testPath!, 'utf8')),
      }),
    })),
    itemSchema: QualityReviewSchema,
    batchSize: projectConfig.agent.scoreBatchSize,
    cwd: workspaceRoot,
    logger: params.logger,
  });

  return {
    files: files.map((file) => ({
      ...file,
      pendingReview: file.testPath ? reviews.get(path.relative(workspaceRoot, file.testPath)) : undefined,
    })),
  };
};

const reviewQuality = async ({ params, files, metadataByProject, options }: State) => {
  const { workspaceRoot, run } = params.context;
  const reviewedFiles = await forEachPendingFile({
    params,
    files,
    label: 'quality loop',
    shouldProcess: isReadyForQuality,
    process: (file) =>
      reviewTestQuality({
        file,
        metadata: metadataByProject[file.projectRoot],
        options,
        provider: params.provider,
        workspaceRoot,
        logger: params.logger.child(path.relative(workspaceRoot, file.sourcePath)),
        run,
      }),
  });
  return { files: reviewedFiles };
};

const FAILED_WITH_EDITS = ['coverageFailed', 'qualityFailed'];
const PASSED = ['improved', 'alreadyCovered'];

const finishFiles = ({ params, files, options, cache }: State) => {
  const relative = (file: string) => path.relative(params.context.workspaceRoot, file);
  const finished = files.map((file) => {
    const passedThisRun =
      PASSED.includes(file.status) && file.latestCoverage && !file.reason.includes('(cache)');
    if (passedThisRun) {
      cache.rememberPass(cacheKeyFor({ cache, file, goal: options.goal }), {
        lines: file.latestCoverage!.lines,
      });
    }

    const leavesFailedEdits =
      FAILED_WITH_EDITS.includes(file.status) && file.testPath !== undefined && file.changedFiles.length > 0;
    if (!leavesFailedEdits) return file;
    const wasAnnotated = annotateFailure({ file: file.testPath!, ruleId: RULE_ID, reason: file.reason });
    if (wasAnnotated) params.logger.warn(`left a [TODO] comment in ${relative(file.testPath!)}`);
    return wasAnnotated
      ? { ...file, changedFiles: [...new Set([...file.changedFiles, file.testPath!])] }
      : file;
  });
  return { files: finished };
};

const buildReport = ({ params, files, options }: State) => ({
  report: buildCoverageReport({
    files,
    options,
    workspaceRoot: params.context.workspaceRoot,
    ruleId: RULE_ID,
    title: RULE_TITLE,
  }),
});

const hasPendingFiles = ({ files }: State) => files.some(isPending);

export const testCoverageGraph = new StateGraph(CoverageRuleState)
  .addNode('askOptions', askOptions)
  .addNode('discardUntestableFiles', discardUntestableFiles)
  .addNode('skipUnchangedPasses', skipUnchangedPasses)
  .addNode('captureMetadataPerProject', captureMetadataPerProject)
  .addNode('measureInitialCoverage', measureInitialCoverage)
  .addNode('chooseNaming', chooseNaming)
  .addNode('homologateFileDomains', homologateFileDomains)
  .addNode('increaseCoverage', increaseCoverage)
  .addNode('scoreQualityInBatches', scoreQualityInBatches)
  .addNode('reviewQuality', reviewQuality)
  .addNode('finishFiles', finishFiles)
  .addNode('buildReport', buildReport)
  .addEdge(START, 'askOptions')
  .addEdge('askOptions', 'discardUntestableFiles')
  .addEdge('discardUntestableFiles', 'skipUnchangedPasses')
  .addConditionalEdges(
    'skipUnchangedPasses',
    (state) => (hasPendingFiles(state) ? 'captureMetadataPerProject' : 'finishFiles'),
    ['captureMetadataPerProject', 'finishFiles'],
  )
  .addEdge('captureMetadataPerProject', 'measureInitialCoverage')
  .addConditionalEdges(
    'measureInitialCoverage',
    (state) => (needsNewTestFiles(state) ? 'chooseNaming' : 'increaseCoverage'),
    ['chooseNaming', 'increaseCoverage'],
  )
  .addEdge('chooseNaming', 'homologateFileDomains')
  .addEdge('homologateFileDomains', 'increaseCoverage')
  .addEdge('increaseCoverage', 'scoreQualityInBatches')
  .addEdge('scoreQualityInBatches', 'reviewQuality')
  .addEdge('reviewQuality', 'finishFiles')
  .addEdge('finishFiles', 'buildReport')
  .addEdge('buildReport', END)
  .compile({ name: RULE_ID });

export const testCoverageRule: Rule = {
  id: RULE_ID,
  title: RULE_TITLE,
  description:
    'Raises per-file line coverage to a goal with an agent, then scores the tests against the testing guidelines.',
  async run(params) {
    const { report } = await testCoverageGraph.invoke({ params, files: [] });
    return report!;
  },
};
