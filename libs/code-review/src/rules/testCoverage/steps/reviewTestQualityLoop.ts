import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { createRetryLoop } from '../../../graph/createRetryLoop';
import type { AgentProvider } from '../../../providers/AgentProvider';
import { analyzeStructured } from '../../../providers/analyzeStructured';
import type { Logger } from '../../../shared/logger';
import type { RunArtifacts } from '../../../shared/runArtifacts';
import {
  buildFixTestQualityPrompt,
  buildScoreTestQualityPrompt,
  type QualityReview,
} from '../prompts/testQualityPrompts';
import { meetsGoal, type TestCoverageOptions, type TrackedFile } from '../TrackedFile';
import {
  describeEditProblems,
  runAgentEdit,
  agentEditRetryChecks,
  describeUnsuccessfulLoop,
  type AgentEditResult,
} from './increaseCoverageLoop';
import { flagSignals, inspectTestFile, type SignalFlag } from './inspectTestFile';
import { measureFileCoverage, type TestMetadata } from './measureFileCoverage';

export const MINIMUM_ACCEPTABLE_SCORE = 7;

const score = z.number().min(0).max(10);

export const QualityReviewSchema = z.object({
  scores: z.object({
    overMocking: score,
    isolation: score,
    globalsAvoidance: score,
    density: score,
    selfContainment: score,
  }),
  flags: z.array(z.string()),
  evidence: z.array(z.string()),
  suggestedFixes: z.array(z.string()),
});

export async function reviewTestQuality({
  file,
  metadata,
  options,
  provider,
  workspaceRoot,
  logger,
  run,
}: {
  file: TrackedFile;
  metadata: TestMetadata;
  options: TestCoverageOptions;
  provider: AgentProvider;
  workspaceRoot: string;
  logger: Logger;
  run: RunArtifacts;
}): Promise<TrackedFile> {
  const progress = {
    latestCoverage: file.latestCoverage!,
    latestReview: undefined as QualityReview | undefined,
    blockingFlags: [] as SignalFlag[],
    changedFiles: new Set<string>(),
  };

  const qualityLoop = createRetryLoop<TrackedFile, AgentEditResult | undefined>({
    name: 'quality',
    maxAttempts: options.maxQualityAttempts,
    startWith: 'evaluation',
    retryChecks: agentEditRetryChecks,
    attempt: async ({ history }) => {
      const prompt = buildFixTestQualityPrompt({
        workspaceRoot,
        sourcePath: file.sourcePath,
        testPath: file.testPath!,
        goal: options.goal,
        review: progress.latestReview,
        blockingFlags: progress.blockingFlags,
        history,
      });
      return runAgentEdit({ provider, task: 'fix-test-quality', prompt, workspaceRoot, logger });
    },
    evaluate: async ({ result, attemptNumber }) => {
      result?.changedFiles.forEach((changed) => progress.changedFiles.add(changed));
      const editProblems = result ? describeEditProblems(result) : [];
      const isAfterAgentFix = attemptNumber > 0;

      if (isAfterAgentFix) {
        progress.latestCoverage = await measureFileCoverage({ metadata, sourcePath: file.sourcePath, run });
        const keepsCoverageGoal = meetsGoal({ coverage: progress.latestCoverage, goal: options.goal });
        if (!keepsCoverageGoal) {
          const coverageProblem = `coverage regressed to ${progress.latestCoverage.lines}% or tests fail (goal ${options.goal}%)`;
          return {
            passed: false,
            feedback: [coverageProblem, ...editProblems].join(' · '),
            changedFiles: result?.changedFiles.map((changed) => path.relative(workspaceRoot, changed)),
          };
        }
      }

      const signals = inspectTestFile(fs.readFileSync(file.testPath!, 'utf8'));
      progress.blockingFlags = flagSignals(signals).filter(({ isBlocking }) => isBlocking);
      progress.latestReview = await analyzeStructured({
        provider,
        task: 'score-test-quality',
        prompt: buildScoreTestQualityPrompt({
          workspaceRoot,
          sourcePath: file.sourcePath,
          testPath: file.testPath!,
          signals,
        }),
        schema: QualityReviewSchema,
        cwd: workspaceRoot,
        logger,
      });

      const lowScores = Object.entries(progress.latestReview.scores).filter(
        ([, value]) => value < MINIMUM_ACCEPTABLE_SCORE,
      );
      const hasOnlyAcceptableScores = lowScores.length === 0;
      const hasNoBlockingFlags = progress.blockingFlags.length === 0;

      const feedback = [
        hasOnlyAcceptableScores
          ? `all scores ≥ ${MINIMUM_ACCEPTABLE_SCORE}`
          : `low scores: ${lowScores.map(([name, value]) => `${name} ${value}`).join(', ')}`,
        hasNoBlockingFlags
          ? undefined
          : `blocking: ${progress.blockingFlags.map(({ explanation }) => explanation).join('; ')}`,
        ...editProblems,
      ].filter(Boolean);

      return {
        passed: hasOnlyAcceptableScores && hasNoBlockingFlags,
        feedback: feedback.join(' · '),
        scores: progress.latestReview.scores,
        flags: [...progress.latestReview.flags, ...progress.blockingFlags.map(({ flag }) => flag)],
        changedFiles: result?.changedFiles.map((changed) => path.relative(workspaceRoot, changed)),
      };
    },
  });

  const outcome = await qualityLoop.run({ context: file, logger });
  return {
    ...file,
    latestCoverage: progress.latestCoverage,
    qualityHistory: outcome.history,
    qualityScores: progress.latestReview?.scores,
    changedFiles: [...new Set([...file.changedFiles, ...progress.changedFiles])],
    status: outcome.passed ? 'improved' : 'qualityFailed',
    reason: outcome.passed
      ? `${file.reason}; quality passed`
      : `${file.reason}; quality ${describeUnsuccessfulLoop({ attemptsUsed: outcome.attemptsUsed, stopReason: outcome.stopReason, lastFeedback: outcome.lastEvaluation?.feedback })}`,
  };
}
