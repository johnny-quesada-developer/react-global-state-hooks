import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { createRetryLoop } from '../../../graph/createRetryLoop';
import type { AgentProvider } from '../../../providers/AgentProvider';
import { analyzeStructured } from '../../../providers/analyzeStructured';
import {
  addUsage,
  agentEditRetryChecks,
  canContinueSession,
  createAgentSession,
  describeEditProblems,
  describeUnsuccessfulLoop,
  runAgentEdit,
  type AgentEditResult,
} from '../../../segments/rules/agentEdit';
import type { Logger } from '../../../shared/logger';
import type { RunArtifacts } from '../../../shared/runArtifacts';
import {
  buildQualityFixPrompt,
  buildQualityScoreSystemPrompt,
  buildQualityScoreUserPrompt,
  type QualityReview,
} from '../prompts/testQualityPrompts';
import type { Guideline } from '../testingGuidelines';
import { meetsGoal, type TestCoverageOptions, type TrackedFile } from '../TrackedFile';
import { flagSignals, inspectTestFile, type SignalFlag } from './inspectTestFile';
import { measureFileCoverage, type TestMetadata } from './measureFileCoverage';

export type AdditionalQualityCheck = (params: {
  sourcePath: string;
  testPath: string;
  content: string;
}) => SignalFlag[] | Promise<SignalFlag[]>;

export const buildQualityReviewSchema = (scoredCriteria: string[]) => {
  const score = z.number().min(0).max(10);
  return z.object({
    scores: z.object(Object.fromEntries(scoredCriteria.map((criterion) => [criterion, score]))),
    flags: z.array(z.string()),
    evidence: z.array(z.string()),
    suggestedFixes: z.array(z.string()),
  });
};

export async function readBlockingFlags({
  testPath,
  additionalQualityChecks,
}: {
  testPath: string;
  additionalQualityChecks?: AdditionalQualityCheck;
}): Promise<SignalFlag[]> {
  const content = fs.readFileSync(testPath, 'utf8');
  const staticFlags = flagSignals(inspectTestFile(content)).filter(({ isBlocking }) => isBlocking);
  const customFlags = additionalQualityChecks ? await additionalQualityChecks({ sourcePath: testPath, testPath, content }) : [];
  return [...staticFlags, ...customFlags];
}

export function judgeQuality({
  review,
  blockingFlags,
  qualityPassThreshold,
}: {
  review: QualityReview | undefined;
  blockingFlags: SignalFlag[];
  qualityPassThreshold: number;
}) {
  const lowScores = Object.entries(review?.scores ?? {}).filter(([, value]) => value < qualityPassThreshold);
  const hasOnlyAcceptableScores = review !== undefined && lowScores.length === 0;
  const hasNoBlockingFlags = blockingFlags.length === 0;
  const feedback = [
    review === undefined
      ? 'AI scoring skipped: deterministic blocking problems must be fixed first'
      : hasOnlyAcceptableScores
        ? `all scores ≥ ${qualityPassThreshold}`
        : `low scores: ${lowScores.map(([name, value]) => `${name} ${value}`).join(', ')}`,
    hasNoBlockingFlags ? undefined : `blocking: ${blockingFlags.map(({ explanation }) => explanation).join('; ')}`,
  ].filter(Boolean);
  return { passed: hasOnlyAcceptableScores && hasNoBlockingFlags, feedback: feedback.join(' · ') };
}

export async function reviewTestQuality({
  file,
  metadata,
  options,
  guidelines,
  scoredCriteria,
  qualityPassThreshold,
  additionalQualityChecks,
  provider,
  workspaceRoot,
  logger,
  run,
}: {
  file: TrackedFile;
  metadata: TestMetadata;
  options: TestCoverageOptions;
  guidelines: Guideline[];
  scoredCriteria: string[];
  qualityPassThreshold: number;
  additionalQualityChecks?: AdditionalQualityCheck;
  provider: AgentProvider;
  workspaceRoot: string;
  logger: Logger;
  run: RunArtifacts;
}): Promise<TrackedFile> {
  const session = file.agentSession ?? createAgentSession();
  const reviewSchema = buildQualityReviewSchema(scoredCriteria);
  const scoreSystemPrompt = buildQualityScoreSystemPrompt({ guidelines, scoredCriteria });
  const progress = {
    latestCoverage: file.latestCoverage!,
    latestReview: undefined as QualityReview | undefined,
    pendingReview: file.pendingReview,
    blockingFlags: [] as SignalFlag[],
    changedFiles: new Set<string>(),
    usage: file.usage,
  };

  const scoreWithAi = () =>
    analyzeStructured({
      provider,
      task: 'score-test-quality',
      systemPrompt: scoreSystemPrompt,
      prompt: buildQualityScoreUserPrompt({
        workspaceRoot,
        sourcePath: file.sourcePath,
        testPath: file.testPath!,
        signals: inspectTestFile(fs.readFileSync(file.testPath!, 'utf8')),
      }),
      schema: reviewSchema,
      cwd: workspaceRoot,
      logger,
    });

  const takePendingOrScore = async () => {
    const pending = progress.pendingReview;
    progress.pendingReview = undefined;
    return pending ?? scoreWithAi();
  };

  const qualityLoop = createRetryLoop<TrackedFile, AgentEditResult | undefined>({
    name: 'quality',
    maxAttempts: options.maxQualityAttempts,
    startWith: 'evaluation',
    retryChecks: agentEditRetryChecks,
    attempt: async ({ history }) => {
      const prompt = buildQualityFixPrompt({
        mode: canContinueSession({ provider, session }) ? 'continue' : 'fresh',
        workspaceRoot,
        sourcePath: file.sourcePath,
        testPath: file.testPath!,
        goal: options.goal,
        review: progress.latestReview,
        blockingFlags: progress.blockingFlags,
        history,
      });
      const edit = await runAgentEdit({ provider, task: 'fix-test-quality', prompt, session, workspaceRoot, logger });
      progress.usage = addUsage(progress.usage, edit.outcome.usage);
      return edit;
    },
    evaluate: async ({ result, attemptNumber }) => {
      result?.changedFiles.forEach((changed) => progress.changedFiles.add(changed));
      const editProblems = result ? describeEditProblems(result) : [];
      const changedFiles = result?.changedFiles.map((changed) => path.relative(workspaceRoot, changed));
      const isAfterAgentFix = attemptNumber > 0;

      if (isAfterAgentFix) {
        progress.latestCoverage = await measureFileCoverage({ metadata, sourcePath: file.sourcePath, run });
        const keepsCoverageGoal = meetsGoal({ coverage: progress.latestCoverage, goal: options.goal });
        if (!keepsCoverageGoal) {
          const coverageProblem = `coverage regressed to ${progress.latestCoverage.lines}% or tests fail (goal ${options.goal}%)`;
          return { passed: false, feedback: [coverageProblem, ...editProblems].join(' · '), changedFiles };
        }
      }

      progress.blockingFlags = await readBlockingFlags({ testPath: file.testPath!, additionalQualityChecks });
      const canSkipAiScoring = progress.blockingFlags.length > 0;
      progress.latestReview = canSkipAiScoring ? undefined : await takePendingOrScore();

      const verdict = judgeQuality({ review: progress.latestReview, blockingFlags: progress.blockingFlags, qualityPassThreshold });
      return {
        passed: verdict.passed,
        feedback: [verdict.feedback, ...editProblems].join(' · '),
        scores: progress.latestReview?.scores,
        flags: [...(progress.latestReview?.flags ?? []), ...progress.blockingFlags.map(({ flag }) => flag)],
        changedFiles,
      };
    },
  });

  const outcome = await qualityLoop.run({ context: file, logger });
  return {
    ...file,
    agentSession: session,
    pendingReview: undefined,
    latestCoverage: progress.latestCoverage,
    qualityHistory: outcome.history,
    qualityScores: progress.latestReview?.scores,
    changedFiles: [...new Set([...file.changedFiles, ...progress.changedFiles])],
    usage: progress.usage,
    status: outcome.passed ? 'improved' : 'qualityFailed',
    reason: outcome.passed
      ? `${file.reason}; quality passed`
      : `${file.reason}; quality ${describeUnsuccessfulLoop({
          attemptsUsed: outcome.attemptsUsed,
          stopReason: outcome.stopReason,
          lastFeedback: outcome.lastEvaluation?.feedback,
        })}`,
  };
}
