import crypto from 'node:crypto';
import path from 'node:path';
import { stopWhenNothingChangesTwice, type RetryCheck } from '../../graph/retryChecks';
import { stopWhenProviderUnavailable } from '../../providers/agentFailure';
import type { AgentProvider, AgentUsage, EditOutcome } from '../../providers/AgentProvider';
import type { AgentSession } from '../../providers/ProviderDefinition';
import { listChangedSince, snapshotWorkingTree } from '../../shared/git';
import type { Logger } from '../../shared/logger';

export interface AgentEditResult {
  outcome: EditOutcome;
  changedFiles: string[];
}

export const createAgentSession = (): AgentSession => ({ id: crypto.randomUUID(), hasStarted: false });

export const canContinueSession = ({
  provider,
  session,
}: {
  provider: AgentProvider;
  session: AgentSession | undefined;
}) => Boolean(session && provider.supportsSessions && session.hasStarted);

export async function runAgentEdit({
  provider,
  task,
  prompt,
  systemPrompt,
  session,
  workspaceRoot,
  logger,
}: {
  provider: AgentProvider;
  task: string;
  prompt: string;
  systemPrompt?: string;
  session?: AgentSession;
  workspaceRoot: string;
  logger: Logger;
}): Promise<AgentEditResult> {
  const before = await snapshotWorkingTree({ cwd: workspaceRoot });
  const outcome = await provider.edit({ task, prompt, systemPrompt, session, cwd: workspaceRoot, logger });
  const changedFiles = await listChangedSince({ cwd: workspaceRoot, snapshot: before });
  const changedLabels = changedFiles.map((file) => path.relative(workspaceRoot, file)).join(', ') || 'none';
  logger.detail(`agent changed ${changedFiles.length} file(s): ${changedLabels}`);

  const cannotTellWhyNothingChanged =
    outcome.exitCode === 0 &&
    changedFiles.length === 0 &&
    outcome.deniedActions.length === 0 &&
    !provider.reportsPermissionDenials;
  if (cannotTellWhyNothingChanged) {
    logger.warn(
      `${provider.label} changed nothing and can't report whether permissions blocked the edit — if this repeats, check the granted permission scope`,
    );
  }

  return { outcome, changedFiles };
}

export function describeEditProblems({ outcome }: AgentEditResult): string[] {
  const exitProblem =
    outcome.exitCode === 124
      ? ['agent timed out (agent.attemptTimeoutMinutes in review.config.json)']
      : outcome.exitCode !== 0
        ? [`agent exited with code ${outcome.exitCode}: ${outcome.summary.slice(-300)}`]
        : [];
  const denialProblem = outcome.deniedActions.length
    ? [
        `edits were denied by your provider permissions (${outcome.deniedActions.join(', ')}); grant a wider scope next run`,
      ]
    : [];
  return [...exitProblem, ...denialProblem];
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

export const emptyUsage = (): AgentUsage => ({ turns: 0, costUsd: 0, durationMs: 0 });

export const addUsage = (total: AgentUsage, usage: AgentUsage | undefined): AgentUsage =>
  usage
    ? {
        turns: (total.turns ?? 0) + (usage.turns ?? 0),
        costUsd: (total.costUsd ?? 0) + (usage.costUsd ?? 0),
        durationMs: total.durationMs + usage.durationMs,
      }
    : total;

export const formatDuration = (durationMs: number) => {
  const seconds = Math.round(durationMs / 1000);
  return seconds >= 60
    ? `${Math.floor(seconds / 60)}m${String(seconds % 60).padStart(2, '0')}s`
    : `${seconds}s`;
};
