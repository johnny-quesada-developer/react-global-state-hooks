import type { AttemptRecord, Evaluation } from './attemptHistory';

export interface RetryAssessment {
  isWorthRetrying: boolean;
  reason: string;
}

export type RetryCheck<TResult> = (params: {
  result: TResult | undefined;
  evaluation: Evaluation;
  history: AttemptRecord[];
}) => RetryAssessment | undefined;

const stop = (reason: string): RetryAssessment => ({ isWorthRetrying: false, reason });

export const keepTrying: RetryAssessment = {
  isWorthRetrying: true,
  reason: 'the failure can still change with another attempt',
};

export function assessRetry<TResult>({
  checks,
  ...params
}: Parameters<RetryCheck<TResult>>[0] & { checks: RetryCheck<TResult>[] }): RetryAssessment {
  return (
    checks.map((check) => check(params)).find((assessment) => assessment && !assessment.isWorthRetrying) ??
    keepTrying
  );
}

const lastTwoAttempts = (history: AttemptRecord[]) => history.filter(({ attempt }) => attempt > 0).slice(-2);

export const stopWhenFailureRepeats: RetryCheck<unknown> = ({ history }) => {
  const [previous, latest] = history.slice(-2);
  const hasTwoFailures = Boolean(previous && latest && !previous.passed && !latest.passed);
  const repeatsSameFailure = hasTwoFailures && previous.feedback === latest.feedback;
  const changedNothing = !latest?.changedFiles?.length;
  return repeatsSameFailure && changedNothing
    ? stop('the exact same failure repeated without any file change')
    : undefined;
};

export const stopWhenNothingChangesTwice: RetryCheck<unknown> = ({ history }) => {
  const attempts = lastTwoAttempts(history);
  const bothTrackedChanges =
    attempts.length === 2 && attempts.every(({ changedFiles }) => changedFiles !== undefined);
  const neitherChangedFiles =
    bothTrackedChanges && attempts.every(({ changedFiles }) => changedFiles!.length === 0);
  return neitherChangedFiles ? stop('the agent did not change any file in the last two attempts') : undefined;
};

export const stopWhenScoresStagnate: RetryCheck<unknown> = ({ history }) => {
  const attempts = lastTwoAttempts(history);
  const bothScored = attempts.length === 2 && attempts.every(({ scores }) => scores !== undefined);
  const scoresDidNotMove =
    bothScored && JSON.stringify(attempts[0].scores) === JSON.stringify(attempts[1].scores);
  return scoresDidNotMove
    ? stop(`no measurable progress in the last two attempts (${JSON.stringify(attempts[1].scores)})`)
    : undefined;
};
