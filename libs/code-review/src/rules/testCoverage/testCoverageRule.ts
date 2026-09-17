import path from 'node:path';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { createSequentialLoop } from '../../graph/createSequentialLoop';
import type { Rule, RuleReport, RuleRunParams } from '../../segments/rules/Rule';
import { findOwningPackageRoot } from '../../shared/workspace';
import { buildCoverageReport } from './buildCoverageReport';
import { captureTestMetadata } from './steps/captureTestMetadata';
import { findUntestableReason } from './steps/discardUntestableFiles';
import { homologateFileDomain } from './steps/homologateFileDomain';
import { increaseFileCoverage } from './steps/increaseCoverageLoop';
import { measureFileCoverage, type TestMetadata } from './steps/measureFileCoverage';
import { reviewTestQuality } from './steps/reviewTestQualityLoop';
import { chooseTestSuffix, findDedicatedTestFile, type TestSuffix } from './steps/testNaming';
import { isPending, meetsGoal, trackFile, type TestCoverageOptions, type TrackedFile } from './TrackedFile';

const RULE_ID = 'test-coverage';
const RULE_TITLE = 'Increase test coverage with quality tests';

const CoverageRuleState = Annotation.Root({
  params: Annotation<RuleRunParams>(),
  options: Annotation<TestCoverageOptions>(),
  files: Annotation<TrackedFile[]>(),
  metadataByProject: Annotation<Record<string, TestMetadata>>(),
  testSuffix: Annotation<TestSuffix | undefined>(),
  report: Annotation<RuleReport | undefined>(),
});
type State = typeof CoverageRuleState.State;

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

async function forEachPendingFile({
  files,
  label,
  shouldProcess = isPending,
  process,
}: {
  files: TrackedFile[];
  label: string;
  shouldProcess?: (file: TrackedFile) => boolean;
  process: (file: TrackedFile) => Promise<TrackedFile>;
}): Promise<TrackedFile[]> {
  const loop = createSequentialLoop<TrackedFile, TrackedFile>({
    name: label,
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
    `goal ${goal}% · coverage attempts ${maxCoverageAttempts} · quality attempts ${maxQualityAttempts}`,
  );
  return { options: { goal, maxCoverageAttempts, maxQualityAttempts }, metadataByProject: {} };
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

const chooseNaming = async ({ params, files }: State) => {
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
  return { testSuffix };
};

const homologateFileDomains = async ({ params, files, metadataByProject, testSuffix }: State) => {
  const { workspaceRoot, run } = params.context;
  const relative = (file: string) => path.relative(workspaceRoot, file);
  const homologatedFiles = await forEachPendingFile({
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

const reviewQuality = async ({ params, files, metadataByProject, options }: State) => {
  const { workspaceRoot, run } = params.context;
  const reviewedFiles = await forEachPendingFile({
    files,
    label: 'quality loop',
    shouldProcess: (file) => file.status === 'improved' && Boolean(file.testPath),
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
  .addNode('captureMetadataPerProject', captureMetadataPerProject)
  .addNode('measureInitialCoverage', measureInitialCoverage)
  .addNode('chooseNaming', chooseNaming)
  .addNode('homologateFileDomains', homologateFileDomains)
  .addNode('increaseCoverage', increaseCoverage)
  .addNode('reviewQuality', reviewQuality)
  .addNode('buildReport', buildReport)
  .addEdge(START, 'askOptions')
  .addEdge('askOptions', 'discardUntestableFiles')
  .addConditionalEdges(
    'discardUntestableFiles',
    (state) => (hasPendingFiles(state) ? 'captureMetadataPerProject' : 'buildReport'),
    ['captureMetadataPerProject', 'buildReport'],
  )
  .addEdge('captureMetadataPerProject', 'measureInitialCoverage')
  .addConditionalEdges(
    'measureInitialCoverage',
    (state) => (needsNewTestFiles(state) ? 'chooseNaming' : 'increaseCoverage'),
    ['chooseNaming', 'increaseCoverage'],
  )
  .addEdge('chooseNaming', 'homologateFileDomains')
  .addEdge('homologateFileDomains', 'increaseCoverage')
  .addEdge('increaseCoverage', 'reviewQuality')
  .addEdge('reviewQuality', 'buildReport')
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
