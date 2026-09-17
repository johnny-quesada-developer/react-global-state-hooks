import path from 'node:path';
import { createRetryLoop } from '../../../graph/createRetryLoop';
import {
  stopWhenNothingChangesTwice,
  stopWhenScoresStagnate,
  type RetryCheck,
} from '../../../graph/retryChecks';
import { stopWhenProviderUnavailable } from '../../../providers/agentFailure';
import type { AgentProvider, EditOutcome } from '../../../providers/AgentProvider';
import { listChangedSince, snapshotWorkingTree } from '../../../shared/git';
import type { Logger } from '../../../shared/logger';
import type { RunArtifacts } from '../../../shared/runArtifacts';
import { buildIncreaseCoveragePrompt } from '../prompts/increaseCoveragePrompt';
import { meetsGoal, type CoverageSnapshot, type TestCoverageOptions, type TrackedFile } from '../TrackedFile';
import { measureFileCoverage, type TestMetadata } from './measureFileCoverage';

export interface AgentEditResult {
  outcome: EditOutcome;
  changedFiles: string[];
}

export async function runAgentEdit({
  provider,
  task,
  prompt,
  workspaceRoot,
  logger,
}: {
  provider: AgentProvider;
  task: string;
  prompt: string;
  workspaceRoot: string;
  logger: Logger;
}): Promise<AgentEditResult> {
  const before = await snapshotWorkingTree({ cwd: workspaceRoot });
  const outcome = await provider.edit({ task, prompt, cwd: workspaceRoot, logger });
  const changedFiles = await listChangedSince({ cwd: workspaceRoot, snapshot: before });
  logger.detail(
    `agent changed ${changedFiles.length} file(s): ${changedFiles.map((file) => path.relative(workspaceRoot, file)).join(', ') || 'none'}`,
  );
  return { outcome, changedFiles };
}

export const stopWhenBlockedByPermissions: RetryCheck<AgentEditResult | undefined> = ({ result }) => {
  const wasBlocked = Boolean(
    result && result.outcome.deniedActions.length > 0 && result.changedFiles.length === 0,
  );
  return wasBlocked
    ? {
        isWorthRetrying: false,
        reason: 'your provider permissions denied every edit, so no attempt can apply changes',
      }
    : undefined;
};

export const agentEditRetryChecks = [
  stopWhenProviderUnavailable,
  stopWhenBlockedByPermissions,
  stopWhenNothingChangesTwice,
] as RetryCheck<AgentEditResult | undefined>[];

export const describeUnsuccessfulLoop = ({
  attemptsUsed,
  stopReason,
  lastFeedback,
}: {
  attemptsUsed: number;
  stopReason?: string;
  lastFeedback?: string;
}) => {
  const ending = stopReason
    ? `stopped early after ${attemptsUsed} attempt(s) because ${stopReason}`
    : `not reached after ${attemptsUsed} attempt(s)`;
  return `${ending}: ${lastFeedback}`;
};

export function describeEditProblems({ outcome }: AgentEditResult): string[] {
  const exitProblem =
    outcome.exitCode !== 0
      ? [`agent exited with code ${outcome.exitCode}: ${outcome.summary.slice(-300)}`]
      : [];
  const denialProblem = outcome.deniedActions.length
    ? [
        `edits were denied by your provider permissions (${outcome.deniedActions.join(', ')}); allow edits or use interactive mode`,
      ]
    : [];
  return [...exitProblem, ...denialProblem];
}

export async function increaseFileCoverage({
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
  const progress = { latestCoverage: file.latestCoverage!, changedFiles: new Set<string>() };

  const coverageLoop = createRetryLoop<TrackedFile, AgentEditResult>({
    name: 'coverage',
    maxAttempts: options.maxCoverageAttempts,
    retryChecks: [...agentEditRetryChecks, stopWhenScoresStagnate] as RetryCheck<AgentEditResult>[],
    attempt: async ({ history }) => {
      const prompt = buildIncreaseCoveragePrompt({
        workspaceRoot,
        sourcePath: file.sourcePath,
        testPath: file.testPath!,
        metadata,
        goal: options.goal,
        coverage: progress.latestCoverage,
        history,
      });
      return runAgentEdit({ provider, task: 'increase-coverage', prompt, workspaceRoot, logger });
    },
    evaluate: async ({ result }) => {
      result!.changedFiles.forEach((changed) => progress.changedFiles.add(changed));
      const coverage = await measureFileCoverage({ metadata, sourcePath: file.sourcePath, run });
      progress.latestCoverage = coverage;
      return {
        passed: meetsGoal({ coverage, goal: options.goal }),
        feedback: describeCoverage({
          coverage,
          goal: options.goal,
          editProblems: describeEditProblems(result!),
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
    latestCoverage: progress.latestCoverage,
    coverageHistory: outcome.history,
    changedFiles: [...new Set([...file.changedFiles, ...progress.changedFiles])],
    status: outcome.passed ? 'improved' : 'coverageFailed',
    reason: outcome.passed
      ? `coverage raised to ${progress.latestCoverage.lines}%`
      : `coverage goal ${describeUnsuccessfulLoop({ attemptsUsed: outcome.attemptsUsed, stopReason: outcome.stopReason, lastFeedback: outcome.lastEvaluation?.feedback })}`,
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
