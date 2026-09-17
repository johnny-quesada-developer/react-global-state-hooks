import path from 'node:path';
import { describeHistory, type AttemptRecord } from '../../../graph/attemptHistory';
import type { TestMetadata } from '../steps/measureFileCoverage';
import { describeGuidelines } from '../testingGuidelines';
import type { CoverageSnapshot } from '../TrackedFile';

export function buildIncreaseCoveragePrompt({
  workspaceRoot,
  sourcePath,
  testPath,
  metadata,
  goal,
  coverage,
  history,
}: {
  workspaceRoot: string;
  sourcePath: string;
  testPath: string;
  metadata: TestMetadata;
  goal: number;
  coverage: CoverageSnapshot;
  history: AttemptRecord[];
}): string {
  const relative = (file: string) => path.relative(workspaceRoot, file);
  const failingTestsSection = coverage.testsPassed
    ? ''
    : `\nThe related tests are currently FAILING. Runner output:\n${coverage.outputTail}\n`;

  return `Task: raise the line coverage of ONE source file to at least ${goal}%.

Source file: ${relative(sourcePath)}
Test file to work in: ${relative(testPath)}
Current coverage: lines ${coverage.lines}% · statements ${coverage.statements}% · functions ${coverage.functions}% · branches ${coverage.branches}%
Uncovered source lines: ${coverage.uncoveredLines}
${failingTestsSection}
How tests run in this project (${relative(metadata.projectRoot) || '.'}):
- runner: ${metadata.runner}, environment: ${metadata.testEnvironment}
- notes: ${metadata.testingNotes}

Testing guidelines (they will be scored after coverage passes):
${describeGuidelines()}

Scope:
- The source file is the review target, not an edit boundary. Make every change elsewhere in the repository that this work requires in the same attempt: imports, exports, barrels, configs, shared test utilities, types, or a small production change for testability. Never change the observable behavior of the source file.
- If the source file was recently moved into its own folder, make sure anything still broken by that move is fixed.
- Do not delete, skip or weaken existing tests.
- The pipeline measures coverage itself after you finish; you do not need to report numbers.

Previous attempts for this file:
${describeHistory(history)}`;
}
