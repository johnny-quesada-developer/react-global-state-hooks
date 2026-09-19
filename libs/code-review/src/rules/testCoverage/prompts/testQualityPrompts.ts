import path from 'node:path';
import { describeHistory, type AttemptRecord } from '../../../graph/attemptHistory';
import { summarizeExports } from '../../../shared/sourceSummary';
import { readIfExists } from '../../../shared/workspace';
import type { SignalFlag, TestFileSignals } from '../steps/inspectTestFile';
import { describeGuidelines, type Guideline } from '../testingGuidelines';

export interface QualityReview {
  scores: Record<string, number>;
  flags: string[];
  evidence: string[];
  suggestedFixes: string[];
}

export function buildQualityScoreSystemPrompt({
  guidelines,
  scoredCriteria,
}: {
  guidelines: Guideline[];
  scoredCriteria: string[];
}): string {
  return `You score how well a test file follows these testing guidelines. You never modify anything.

Guidelines:
${describeGuidelines(guidelines)}

Score each guideline from 0 (ignores it) to 10 (exemplary). For overMocking and globalsAvoidance a HIGH score means the file AVOIDS the problem.
Keys of "scores" must be exactly: ${scoredCriteria.join(', ')}.
flags: short camelCase names of concrete violations (empty when none).
evidence: quotes or line references that justify low scores.
suggestedFixes: concrete, actionable changes.
The source file is summarized by its exported signatures; judge the tests, not the source.`;
}

export function buildQualityScoreUserPrompt({
  workspaceRoot,
  sourcePath,
  testPath,
  signals,
}: {
  workspaceRoot: string;
  sourcePath: string;
  testPath: string;
  signals: TestFileSignals;
}): string {
  return `Deterministic signals already measured: ${JSON.stringify(signals)}

--- exports of ${path.relative(workspaceRoot, sourcePath)} ---
${summarizeExports(sourcePath)}

--- test: ${path.relative(workspaceRoot, testPath)} ---
${readIfExists(testPath, 16000)}`;
}

const describeReview = ({
  review,
  blockingFlags,
}: {
  review: QualityReview | undefined;
  blockingFlags: SignalFlag[];
}) => `- scores: ${JSON.stringify(review?.scores ?? {})}
- flags: ${[...(review?.flags ?? []), ...blockingFlags.map(({ flag }) => flag)].join(', ') || 'none'}
- blocking problems (measured deterministically): ${blockingFlags.map(({ explanation }) => explanation).join('; ') || 'none'}
- evidence: ${(review?.evidence ?? []).join(' | ') || 'none'}
- suggested fixes: ${(review?.suggestedFixes ?? []).join(' | ') || 'none'}`;

export function buildQualityFixPrompt({
  mode,
  workspaceRoot,
  sourcePath,
  testPath,
  goal,
  review,
  blockingFlags,
  history,
}: {
  mode: 'continue' | 'fresh';
  workspaceRoot: string;
  sourcePath: string;
  testPath: string;
  goal: number;
  review: QualityReview | undefined;
  blockingFlags: SignalFlag[];
  history: AttemptRecord[];
}): string {
  const relative = (file: string) => path.relative(workspaceRoot, file);
  const reviewSection = describeReview({ review, blockingFlags });

  if (mode === 'continue') {
    return `Coverage is fine. The pipeline reviewed the quality of ${relative(testPath)} against the testing guidelines and it does not pass yet:
${reviewSection}

Fix the tests in place (they contain your previous edits) without dropping line coverage below ${goal}%. Keep all tests passing, verify once with the same commands, then stop.`;
  }

  return `Task: improve the quality of the tests in ${relative(testPath)} (they cover ${relative(sourcePath)}) without dropping line coverage below ${goal}%.

Latest review:
${reviewSection}

--- current test file: ${relative(testPath)} ---
${readIfExists(testPath, 16000)}

Scope: the test file is the review target, not an edit boundary; change any other repository file the fix requires in the same attempt. Keep all tests passing. The pipeline re-measures coverage and re-scores the file after you finish.

Previous reviews for this file:
${describeHistory(history)}`;
}
