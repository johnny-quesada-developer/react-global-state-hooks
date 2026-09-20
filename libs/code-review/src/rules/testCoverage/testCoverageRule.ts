import fs from 'node:fs';
import path from 'node:path';
import { minimatch } from 'minimatch';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { createConcurrentLoop } from '../../graph/createConcurrentLoop';
import { createSequentialLoop } from '../../graph/createSequentialLoop';
import type { Rule, RuleReport, RuleRunParams } from '../../segments/rules/Rule';
import { scoreInBatches } from '../../segments/rules/scoring';
import { annotateFailure } from '../../shared/annotateFailure';
import { createResultCache, type ResultCache } from '../../shared/resultCache';
import { findOwningPackageRoot } from '../../shared/workspace';
import { buildCoverageReport } from './buildCoverageReport';
import { buildQualityScoreSystemPrompt, buildQualityScoreUserPrompt } from './prompts/testQualityPrompts';
import { captureTestMetadata } from './steps/captureTestMetadata';
import { colocateTestFile } from './steps/colocateTestFile';
import { findUntestableReason } from './steps/discardUntestableFiles';
import { homologateFileDomain } from './steps/homologateFileDomain';
import { increaseFileCoverage } from './steps/increaseCoverageLoop';
import { inspectTestFile } from './steps/inspectTestFile';
import { measureFileCoverage, type TestMetadata } from './steps/measureFileCoverage';
import {
  buildQualityReviewSchema,
  readBlockingFlags,
  reviewTestQuality,
  type AdditionalQualityCheck,
} from './steps/reviewTestQualityLoop';
import { chooseTestSuffix, findDedicatedTestFile, type TestSuffix } from './steps/testNaming';
import { DEFAULT_SCORED_CRITERIA, defaultGuidelines, type Guideline } from './testingGuidelines';
import {
  coverageFromCache,
  isPending,
  meetsGoal,
  trackFile,
  type TestCoverageOptions,
  type TrackedFile,
} from './TrackedFile';

export interface TestPlacementParams {
  sourcePath: string;
  workspaceRoot: string;
  suffix: TestSuffix;
}

export interface TestCoverageRuleOptions {
  id?: string;
  title?: string;
  description?: string;
  /** Keeps the rule file in place but skips the rule at run time. */
  disabled?: boolean;
  goal?: number;
  maxCoverageAttempts?: number;
  maxQualityAttempts?: number;
  testSuffix?: TestSuffix;
  qualityPassThreshold?: number;
  guidelines?: Guideline[];
  scoredCriteria?: string[];
  scope?: { include?: string[]; exclude?: string[] };
  /** 'domainFolder' (default): `x.ts` → `x/{index.ts,x.ts,x.test.ts}`. 'colocated': no source movement, a sibling test file is created next to the source. Ignored when `testPlacement` is set. */
  testLayout?: 'domainFolder' | 'colocated';
  /** Escape hatch beyond the two built-in layouts: return where the test file should live; the package validates it, creates the skeleton and measures the baseline. */
  testPlacement?: (params: TestPlacementParams) => Promise<{ testPath: string }> | { testPath: string };
  /** A deterministic check merged with the built-in static signals (globals/timers left dirty, no assertions, …) before the AI quality scorer runs. */
  additionalQualityChecks?: AdditionalQualityCheck;
  annotateFailures?: boolean;
}

const DEFAULT_SCOPE = { include: ['**/*.{ts,tsx,js,jsx}'], exclude: [] as string[] };

interface ResolvedRuleOptions {
  ruleId: string;
  title: string;
  description: string;
  guidelines: Guideline[];
  scoredCriteria: string[];
  qualityPassThreshold: number;
  scope: { include: string[]; exclude: string[] };
  testLayout: 'domainFolder' | 'colocated';
  testSuffix?: TestSuffix;
  testPlacement?: TestCoverageRuleOptions['testPlacement'];
  additionalQualityChecks?: AdditionalQualityCheck;
  annotateFailures: boolean;
}

const CoverageRuleState = Annotation.Root({
  params: Annotation<RuleRunParams>(),
  ruleOptions: Annotation<ResolvedRuleOptions>(),
  options: Annotation<TestCoverageOptions>(),
  files: Annotation<TrackedFile[]>(),
  metadataByProject: Annotation<Record<string, TestMetadata>>(),
  testSuffix: Annotation<TestSuffix | undefined>(),
  cache: Annotation<ResultCache>(),
  report: Annotation<RuleReport | undefined>(),
});
type State = typeof CoverageRuleState.State;

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const concurrencyOf = ({ context }: RuleRunParams) => context.options.concurrency ?? context.settings.agent.concurrency;

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

const cacheKeyFor = ({ cache, file, ruleOptions, goal }: { cache: ResultCache; file: TrackedFile; ruleOptions: ResolvedRuleOptions; goal: number }) =>
  cache.keyFor({
    files: [file.sourcePath, file.testPath ?? findDedicatedTestFile(file.sourcePath) ?? ''].filter(Boolean),
    extra: [
      `goal:${goal}`,
      `threshold:${ruleOptions.qualityPassThreshold}`,
      `criteria:${ruleOptions.scoredCriteria.join(',')}`,
      `layout:${ruleOptions.testLayout}`,
    ].join('|'),
  });

const isInRuleScope = ({ scope, relativePath }: { scope: ResolvedRuleOptions['scope']; relativePath: string }) =>
  scope.include.some((glob) => minimatch(relativePath, glob, { dot: true })) &&
  !scope.exclude.some((glob) => minimatch(relativePath, glob, { dot: true }));

const askOptions = async ({ params, ruleOptions }: State) => {
  const { ask, options: cliOptions } = params.context;
  const goal =
    cliOptions.goal ??
    (await ask.number({ message: 'Desired line coverage per file (%)', defaultValue: 80, min: 1, max: 100 }));
  const maxCoverageAttempts =
    cliOptions.maxCoverageAttempts ??
    (await ask.number({ message: 'Max agent attempts to reach coverage per file', defaultValue: 3, min: 1, max: 10 }));
  const maxQualityAttempts =
    cliOptions.maxQualityAttempts ??
    (await ask.number({ message: 'Max agent attempts to fix test quality per file', defaultValue: 2, min: 0, max: 10 }));
  params.logger.detail(
    `goal ${goal}% · coverage attempts ${maxCoverageAttempts} · quality attempts ${maxQualityAttempts} · concurrency ${concurrencyOf(params)}`,
  );
  return {
    options: { goal, maxCoverageAttempts, maxQualityAttempts },
    metadataByProject: {},
    cache: createResultCache({ reviewDirectory: params.context.run.reviewDirectory, ruleId: ruleOptions.ruleId }),
  };
};

const discardOutOfScopeAndUntestableFiles = ({ params, ruleOptions }: State) => {
  const { workspaceRoot } = params.context;
  const files = params.files.map((file) => {
    const tracked = trackFile({ file, projectRoot: findOwningPackageRoot({ file, workspaceRoot }) });
    const relativePath = path.relative(workspaceRoot, file);
    if (!isInRuleScope({ scope: ruleOptions.scope, relativePath })) {
      return { ...tracked, status: 'outOfScope' as const, reason: 'not in the rule scope' };
    }
    const untestableReason = findUntestableReason(file);
    return untestableReason ? { ...tracked, status: 'notTestable' as const, reason: untestableReason } : tracked;
  });
  const discardedCount = files.filter(({ status }) => status !== 'pending').length;
  params.logger.step(`discarded ${discardedCount} file(s) (out of scope or not testable), ${files.length - discardedCount} left`);
  return { files };
};

const skipUnchangedPasses = ({ params, files, options, ruleOptions, cache }: State) => {
  const relative = (file: string) => path.relative(params.context.workspaceRoot, file);
  const skipped = files.map((file) => {
    if (!isPending(file)) return file;
    const cached = cache.readPass<{ lines: number }>(cacheKeyFor({ cache, file, ruleOptions, goal: options.goal }));
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
      const sampleSourceFile = files.find((file) => isPending(file) && file.projectRoot === projectRoot)!.sourcePath;
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

const needsNewTestFiles = ({ files }: State) => files.some((file) => isPending(file) && file.needsNewTestFile);

const chooseNaming = async ({ params, files, ruleOptions }: State) => {
  if (ruleOptions.testPlacement) return { testSuffix: 'test' as const };
  const projectRoots = [
    ...new Set(files.filter((file) => isPending(file) && file.needsNewTestFile).map(({ projectRoot }) => projectRoot)),
  ];
  const testSuffix = await chooseTestSuffix({
    projectRoots,
    ask: params.context.ask,
    requestedSuffix: params.context.options.testSuffix ?? ruleOptions.testSuffix,
  });
  return { testSuffix };
};

const placeTestFiles = async ({ params, files, metadataByProject, testSuffix, ruleOptions }: State) => {
  const { workspaceRoot, run } = params.context;
  const relative = (file: string) => path.relative(workspaceRoot, file);
  const placedFiles = await forEachPendingFile({
    params,
    files,
    label: 'test placement',
    shouldProcess: (file) => isPending(file) && file.needsNewTestFile,
    process: async (file) => {
      const metadata = metadataByProject[file.projectRoot];
      const suffix = testSuffix ?? 'test';

      if (ruleOptions.testPlacement) {
        const plan = await ruleOptions.testPlacement({ sourcePath: file.sourcePath, workspaceRoot, suffix });
        const result = await colocateTestFile({ sourcePath: file.sourcePath, suffix, metadata, plan });
        return finishPlacement({ file, result, workspaceRoot, run, metadata, logger: params.logger, note: undefined });
      }

      if (ruleOptions.testLayout === 'colocated') {
        const result = await colocateTestFile({ sourcePath: file.sourcePath, suffix, metadata });
        return finishPlacement({ file, result, workspaceRoot, run, metadata, logger: params.logger, note: undefined });
      }

      const result = await homologateFileDomain({ sourcePath: file.sourcePath, suffix, metadata, workspaceRoot });
      const wasMoved = result.sourcePath !== file.sourcePath;
      const note = wasMoved
        ? `homologated into ${relative(path.dirname(result.sourcePath))}/ (${result.referenceUpdates.length} reference(s) updated)`
        : undefined;
      result.referenceUpdates.forEach(({ file: referencingFile, line, after }) =>
        params.logger.detail(`updated reference ${relative(referencingFile)}:${line} → ${after}`),
      );
      if (wasMoved) params.logger.success(`moved ${relative(file.sourcePath)} → ${relative(result.sourcePath)}`);
      return finishPlacement({ file, result, workspaceRoot, run, metadata, logger: params.logger, note });
    },
  });
  return { files: placedFiles };
};

async function finishPlacement({
  file,
  result,
  workspaceRoot,
  run,
  metadata,
  logger,
  note,
}: {
  file: TrackedFile;
  result: { sourcePath: string; testPath: string; changedFiles: string[]; unprocessableReason?: string };
  workspaceRoot: string;
  run: RuleRunParams['context']['run'];
  metadata: TestMetadata;
  logger: RuleRunParams['logger'];
  note: string | undefined;
}): Promise<TrackedFile> {
  const relative = (target: string) => path.relative(workspaceRoot, target);
  if (result.unprocessableReason) {
    logger.error(`${relative(file.sourcePath)}: ${result.unprocessableReason}`);
    return { ...file, status: 'unprocessable', reason: result.unprocessableReason };
  }

  logger.success(`test file ready: ${relative(result.testPath)}`);
  const baseline = await measureFileCoverage({ metadata, sourcePath: result.sourcePath, run });
  return {
    ...file,
    sourcePath: result.sourcePath,
    testPath: result.testPath,
    latestCoverage: baseline,
    changedFiles: [...file.changedFiles, ...result.changedFiles],
    notes: note ? [...file.notes, note] : file.notes,
  };
}

const increaseCoverage = async ({ params, files, metadataByProject, options, ruleOptions }: State) => {
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
        guidelines: ruleOptions.guidelines,
        provider: params.provider,
        workspaceRoot,
        logger: params.logger.child(path.relative(workspaceRoot, file.sourcePath)),
        run,
      }),
  });
  return { files: coveredFiles };
};

const isReadyForQuality = (file: TrackedFile) => file.status === 'improved' && Boolean(file.testPath);

const scoreQualityInBatches = async ({ params, files, ruleOptions }: State) => {
  const { workspaceRoot, settings } = params.context;
  const candidates = files.filter(isReadyForQuality);
  const blockingByFile = new Map(
    await Promise.all(
      candidates.map(async (file) => [file.testPath!, await readBlockingFlags({ testPath: file.testPath!, additionalQualityChecks: ruleOptions.additionalQualityChecks })] as const),
    ),
  );
  const scorable = candidates.filter((file) => (blockingByFile.get(file.testPath!) ?? []).length === 0);
  if (scorable.length < 2) return {};

  params.logger.step(`pre-scoring test quality for ${scorable.length} file(s) in batches of ${settings.agent.scoreBatchSize}`);
  const reviews = await scoreInBatches({
    provider: params.provider,
    task: 'score-test-quality',
    systemPrompt: buildQualityScoreSystemPrompt({ guidelines: ruleOptions.guidelines, scoredCriteria: ruleOptions.scoredCriteria }),
    items: scorable.map((file) => ({
      file: path.relative(workspaceRoot, file.testPath!),
      section: buildQualityScoreUserPrompt({
        workspaceRoot,
        sourcePath: file.sourcePath,
        testPath: file.testPath!,
        signals: inspectTestFile(fs.readFileSync(file.testPath!, 'utf8')),
      }),
    })),
    itemSchema: buildQualityReviewSchema(ruleOptions.scoredCriteria),
    batchSize: settings.agent.scoreBatchSize,
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

const reviewQuality = async ({ params, files, metadataByProject, options, ruleOptions }: State) => {
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
        guidelines: ruleOptions.guidelines,
        scoredCriteria: ruleOptions.scoredCriteria,
        qualityPassThreshold: ruleOptions.qualityPassThreshold,
        additionalQualityChecks: ruleOptions.additionalQualityChecks,
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

const finishFiles = ({ params, files, options, ruleOptions, cache }: State) => {
  const relative = (file: string) => path.relative(params.context.workspaceRoot, file);
  const finished = files.map((file) => {
    const passedThisRun = PASSED.includes(file.status) && file.latestCoverage && !file.reason.includes('(cache)');
    if (passedThisRun) {
      cache.rememberPass(cacheKeyFor({ cache, file, ruleOptions, goal: options.goal }), { lines: file.latestCoverage!.lines });
    }

    const leavesFailedEdits =
      ruleOptions.annotateFailures &&
      FAILED_WITH_EDITS.includes(file.status) &&
      file.testPath !== undefined &&
      file.changedFiles.length > 0;
    if (!leavesFailedEdits) return file;
    const wasAnnotated = annotateFailure({ file: file.testPath!, ruleId: ruleOptions.ruleId, reason: file.reason });
    if (wasAnnotated) params.logger.warn(`left a [TODO] comment in ${relative(file.testPath!)}`);
    return wasAnnotated ? { ...file, changedFiles: [...new Set([...file.changedFiles, file.testPath!])] } : file;
  });
  return { files: finished };
};

const buildReport = ({ params, files, options, ruleOptions }: State) => ({
  report: buildCoverageReport({
    files,
    options,
    workspaceRoot: params.context.workspaceRoot,
    ruleId: ruleOptions.ruleId,
    title: ruleOptions.title,
  }),
});

const hasPendingFiles = ({ files }: State) => files.some(isPending);

const testCoverageGraph = new StateGraph(CoverageRuleState)
  .addNode('askOptions', askOptions)
  .addNode('discardOutOfScopeAndUntestableFiles', discardOutOfScopeAndUntestableFiles)
  .addNode('skipUnchangedPasses', skipUnchangedPasses)
  .addNode('captureMetadataPerProject', captureMetadataPerProject)
  .addNode('measureInitialCoverage', measureInitialCoverage)
  .addNode('chooseNaming', chooseNaming)
  .addNode('placeTestFiles', placeTestFiles)
  .addNode('increaseCoverage', increaseCoverage)
  .addNode('scoreQualityInBatches', scoreQualityInBatches)
  .addNode('reviewQuality', reviewQuality)
  .addNode('finishFiles', finishFiles)
  .addNode('buildReport', buildReport)
  .addEdge(START, 'askOptions')
  .addEdge('askOptions', 'discardOutOfScopeAndUntestableFiles')
  .addEdge('discardOutOfScopeAndUntestableFiles', 'skipUnchangedPasses')
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
  .addEdge('chooseNaming', 'placeTestFiles')
  .addEdge('placeTestFiles', 'increaseCoverage')
  .addEdge('increaseCoverage', 'scoreQualityInBatches')
  .addEdge('scoreQualityInBatches', 'reviewQuality')
  .addEdge('reviewQuality', 'finishFiles')
  .addEdge('finishFiles', 'buildReport')
  .addEdge('buildReport', END)
  .compile({ name: 'test-coverage' });

/**
 * The reusable, configurable coverage rule. All defaults reproduce the tool's original built-in
 * behavior (domain-folder test placement, the six default guidelines, a 7/10 quality threshold);
 * every option narrows or replaces one piece of that without exposing internal graph state.
 */
export function createTestCoverageRule(options: TestCoverageRuleOptions = {}): Rule {
  const ruleOptions: ResolvedRuleOptions = {
    ruleId: options.id ?? 'test-coverage',
    title: options.title ?? 'Increase test coverage with quality tests',
    description:
      options.description ??
      'Raises per-file line coverage to a goal with an agent, then scores the tests against the testing guidelines.',
    guidelines: options.guidelines ?? defaultGuidelines,
    scoredCriteria: options.scoredCriteria ?? DEFAULT_SCORED_CRITERIA,
    qualityPassThreshold: options.qualityPassThreshold ?? 7,
    scope: { include: options.scope?.include ?? DEFAULT_SCOPE.include, exclude: options.scope?.exclude ?? DEFAULT_SCOPE.exclude },
    testLayout: options.testPlacement ? 'colocated' : (options.testLayout ?? 'domainFolder'),
    testSuffix: options.testSuffix,
    testPlacement: options.testPlacement,
    additionalQualityChecks: options.additionalQualityChecks,
    annotateFailures: options.annotateFailures ?? true,
  };

  return {
    id: ruleOptions.ruleId,
    title: ruleOptions.title,
    description: ruleOptions.description,
    disabled: options.disabled,
    async run(params) {
      const { report } = await testCoverageGraph.invoke({ params, ruleOptions, files: [] });
      return report!;
    },
  };
}
