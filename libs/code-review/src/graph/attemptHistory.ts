export interface Evaluation {
  passed: boolean;
  feedback: string;
  scores?: Record<string, number>;
  flags?: string[];
  changedFiles?: string[];
}

export interface AttemptRecord extends Evaluation {
  attempt: number;
}

export function describeHistory(history: AttemptRecord[]): string {
  if (history.length === 0) return 'No previous attempts.';

  return history
    .map(({ attempt, passed, feedback, scores, flags }) => {
      const label = attempt === 0 ? 'Initial evaluation' : `Attempt ${attempt}`;
      const scoreLine = scores ? `\n  scores: ${JSON.stringify(scores)}` : '';
      const flagLine = flags?.length ? `\n  flags: ${flags.join(', ')}` : '';
      return `- ${label} → ${passed ? 'passed' : 'failed'}\n  feedback: ${feedback}${scoreLine}${flagLine}`;
    })
    .join('\n');
}
