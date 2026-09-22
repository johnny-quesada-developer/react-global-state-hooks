import path from 'node:path';
import { createRetryLoop } from '../../../graph/createRetryLoop';
import { stopWhenScoresStagnate, type RetryCheck } from '../../../graph/retryChecks';
import type { AgentProvider } from '../../../providers/AgentProvider';
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
  buildCoverageFeedbackPrompt,
  buildCoverageSystemPrompt,
  buildInitialCoveragePrompt,
} from '../prompts/increaseCoveragePrompt';
import type { Guideline } from '../testingGuidelines';
import { meetsGoal, type CoverageSnapshot, type TestCoverageOptions, type TrackedFile } from '../TrackedFile';
import { measureFileCoverage, type TestMetadata } from './measureFileCoverage';

export async function increaseFileCoverage({
  file,
  metadata,
  options,
  guidelines,
  provider,
  workspaceRoot,
  logger,
  run,
}: {
  file: TrackedFile;
  metadata: TestMetadata;
  options: TestCoverageOptions;
  guidelines: Guideline[];
  provider: AgentProvider;
  workspaceRoot: string;
  logger: Logger;
  run: RunArtifacts;
}): Promise<TrackedFile> {
  const session = file.agentSession ?? createAgentSession();
  const systemPrompt = buildCoverageSystemPrompt({ guidelines });
  const progress = {
    latestCoverage: file.latestCoverage!,
    latestEditProblems: [] as string[],
    changedFiles: new Set<string>(),
    usage: file.usage,
  };

  const coverageLoop = createRetryLoop<TrackedFile, AgentEditResult>({
    name: 'coverage',
    maxAttempts: options.maxCoverageAttempts,
    retryChecks: [...agentEditRetryChecks, stopWhenScoresStagnate] as RetryCheck<AgentEditResult>[],
    attempt: async ({ history, attemptNumber }) => {
      const prompt = canContinueSession({ provider, session })
        ? buildCoverageFeedbackPrompt({
            attemptNumber: attemptNumber - 1,
            goal: options.goal,
            coverage: progress.latestCoverage,
            editProblems: progress.latestEditProblems,
          })
        : buildInitialCoveragePrompt({
            workspaceRoot,
            sourcePath: file.sourcePath,
            testPath: file.testPath!,
            metadata,
            goal: options.goal,
            coverage: progress.latestCoverage,
            history,
          });
      const edit = await runAgentEdit({
        provider,
        task: 'increase-coverage',
        prompt,
        systemPrompt,
        session,
        workspaceRoot,
        logger,
      });
      progress.usage = addUsage(progress.usage, edit.outcome.usage);
      return edit;
    },
    evaluate: async ({ result }) => {
      result!.changedFiles.forEach((changed) => progress.changedFiles.add(changed));
      const coverage = await measureFileCoverage({ metadata, sourcePath: file.sourcePath, run });
      progress.latestCoverage = coverage;
      progress.latestEditProblems = describeEditProblems(result!);
      return {
        passed: meetsGoal({ coverage, goal: options.goal }),
        feedback: describeCoverage({
          coverage,
          goal: options.goal,
          editProblems: progress.latestEditProblems,
        }),
        scores: {
          lines: coverage.lines,
          statements: coverage.statements,
          functions: coverage.functions,
          branches: coverage.branches,
          testsPassing: coverage.testsPassed ? 1 : 0,
        },
        changedFiles: result!.changedFiles.map((changed) => path.relative(workspaceRoot, changed)),
      };
    },
  });

  const outcome = await coverageLoop.run({ context: file, logger });
  return {
    ...file,
    agentSession: session,
    latestCoverage: progress.latestCoverage,
    coverageHistory: outcome.history,
    changedFiles: [...new Set([...file.changedFiles, ...progress.changedFiles])],
    usage: progress.usage,
    status: outcome.passed ? 'improved' : 'coverageFailed',
    reason: outcome.passed
      ? `coverage raised to ${progress.latestCoverage.lines}%`
      : `coverage goal ${describeUnsuccessfulLoop({
          attemptsUsed: outcome.attemptsUsed,
          stopReason: outcome.stopReason,
          lastFeedback: outcome.lastEvaluation?.feedback,
        })}`,
  };
}

function describeCoverage({
  coverage,
  goal,
  editProblems,
}: {
  coverage: CoverageSnapshot;
  goal: number;
  editProblems: string[];
}): string {
  const goalLabel = coverage.lines >= goal ? '✓' : '✗';
  const parts = [
    `lines ${coverage.lines}% → goal ${goal}% ${goalLabel}`,
    coverage.testsPassed ? undefined : 'related tests are failing',
    coverage.lines < goal ? `uncovered lines ${coverage.uncoveredLines}` : undefined,
    ...editProblems,
  ];
  return parts.filter(Boolean).join(' · ');
}
