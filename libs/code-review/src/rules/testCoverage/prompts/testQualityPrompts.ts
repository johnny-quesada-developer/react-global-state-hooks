import path from 'node:path';
import { describeHistory, type AttemptRecord } from '../../../graph/attemptHistory';
import { readIfExists } from '../../../shared/workspace';
import type { SignalFlag, TestFileSignals } from '../steps/inspectTestFile';
import { describeGuidelines } from '../testingGuidelines';

export interface QualityReview {
  scores: Record<string, number>;
  flags: string[];
  evidence: string[];
  suggestedFixes: string[];
}

export function buildScoreTestQualityPrompt({
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
  return `Score how well ONE test file follows the testing guidelines. Do not modify anything.

Guidelines:
${describeGuidelines()}

Score each guideline from 0 (ignores it) to 10 (exemplary). For overMocking and globalsAvoidance a HIGH score means the file AVOIDS the problem.
Scores to return: overMocking, isolation, globalsAvoidance, density, selfContainment.
flags: short camelCase names of concrete violations (empty when none).
evidence: quotes or line references that justify low scores.
suggestedFixes: concrete, actionable changes.

Deterministic signals already measured: ${JSON.stringify(signals)}

--- source: ${path.relative(workspaceRoot, sourcePath)} ---
${readIfExists(sourcePath, 12000)}

--- test: ${path.relative(workspaceRoot, testPath)} ---
${readIfExists(testPath, 16000)}`;
}

export function buildFixTestQualityPrompt({
  workspaceRoot,
  sourcePath,
  testPath,
  goal,
  review,
  blockingFlags,
  history,
}: {
  workspaceRoot: string;
  sourcePath: string;
  testPath: string;
  goal: number;
  review: QualityReview | undefined;
  blockingFlags: SignalFlag[];
  history: AttemptRecord[];
}): string {
  const relative = (file: string) => path.relative(workspaceRoot, file);
  return `Task: improve the quality of the tests in ${relative(testPath)} (they cover ${relative(sourcePath)}) without dropping line coverage below ${goal}%.

Guidelines:
${describeGuidelines()}

Latest review:
- scores: ${JSON.stringify(review?.scores ?? {})}
- flags: ${[...(review?.flags ?? []), ...blockingFlags.map(({ flag }) => flag)].join(', ') || 'none'}
- blocking problems: ${blockingFlags.map(({ explanation }) => explanation).join('; ') || 'none'}
- evidence: ${(review?.evidence ?? []).join(' | ') || 'none'}
- suggested fixes: ${(review?.suggestedFixes ?? []).join(' | ') || 'none'}

Scope: the test file is the review target, not an edit boundary; change any other repository file the fix requires in the same attempt. Keep all tests passing. The pipeline re-measures coverage and re-scores the file after you finish.

Previous reviews for this file:
${describeHistory(history)}`;
}
