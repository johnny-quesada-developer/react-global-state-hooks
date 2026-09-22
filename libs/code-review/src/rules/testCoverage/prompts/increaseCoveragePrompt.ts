import path from 'node:path';
import { describeHistory, type AttemptRecord } from '../../../graph/attemptHistory';
import { readIfExists } from '../../../shared/workspace';
import { renderVerifyCommands, type TestMetadata } from '../steps/measureFileCoverage';
import { describeGuidelines, type Guideline } from '../testingGuidelines';
import type { CoverageSnapshot } from '../TrackedFile';
import { findExampleTest } from './metadataPrompt';

export function buildCoverageSystemPrompt({ guidelines }: { guidelines: Guideline[] }): string {
  return `You raise the test coverage of one source file at a time. The pipeline that runs you is deterministic: after you finish it measures coverage itself and either accepts the result or sends you the measured feedback.

Testing guidelines (they are scored after coverage passes):
${describeGuidelines(guidelines)}

Working rules:
- You already receive the source, the current test file and an example test from the project. Do not re-read them unless something looks stale.
- Write the complete test file in ONE Write call (not many small edits), run the verify command ONCE, fix what fails, run it once more, then stop. Do not report coverage numbers; the pipeline measures them.
- The source file is the review target, not an edit boundary: change imports, exports, barrels, configs, shared test utilities, types, or make a small production change for testability when the task needs it, in the same attempt. Never change the observable behavior of the source file.
- If the source file was recently moved into its own folder, fix anything still broken by that move.
- Do not delete, skip or weaken existing tests.`;
}

const describeCoverage = (coverage: CoverageSnapshot) =>
  `lines ${coverage.lines}% · statements ${coverage.statements}% · functions ${coverage.functions}% · branches ${coverage.branches}%`;

const failingTestsSection = (coverage: CoverageSnapshot) =>
  coverage.testsPassed
    ? ''
    : `\nThe related tests are currently FAILING. Runner output:\n${coverage.outputTail}\n`;

export function buildInitialCoveragePrompt({
  workspaceRoot,
  sourcePath,
  testPath,
  metadata,
  goal,
  coverage,
  history = [],
}: {
  workspaceRoot: string;
  sourcePath: string;
  testPath: string;
  metadata: TestMetadata;
  goal: number;
  coverage: CoverageSnapshot;
  history?: AttemptRecord[];
}): string {
  const relative = (file: string) => path.relative(workspaceRoot, file);
  const exampleTest = findExampleTest(metadata.projectRoot);
  const exampleSection =
    exampleTest && exampleTest !== testPath
      ? `\n--- example test from this project: ${relative(exampleTest)} ---\n${readIfExists(exampleTest, 4000)}\n`
      : '';
  const historySection = history.length
    ? `\nPrevious attempts for this file:\n${describeHistory(history)}\n`
    : '';

  return `Task: raise the line coverage of ${relative(sourcePath)} to at least ${goal}%.

Test file to work in: ${relative(testPath)}
Current coverage: ${describeCoverage(coverage)}
Uncovered source lines: ${coverage.uncoveredLines}
${failingTestsSection(coverage)}
How tests run in this project (${relative(metadata.projectRoot) || '.'}):
- runner: ${metadata.runner}, environment: ${metadata.testEnvironment}
- notes: ${metadata.testingNotes}
- verify with exactly these commands (cwd: ${relative(metadata.projectRoot) || '.'}):
${renderVerifyCommands({ metadata, sourcePath })
  .map((command) => `    ${command}`)
  .join('\n')}

--- source: ${relative(sourcePath)} ---
${readIfExists(sourcePath, 16000)}

--- current test file: ${relative(testPath)} ---
${readIfExists(testPath, 16000) ?? '(does not exist yet)'}
${exampleSection}${historySection}`;
}

export function buildCoverageFeedbackPrompt({
  attemptNumber,
  goal,
  coverage,
  editProblems,
}: {
  attemptNumber: number;
  goal: number;
  coverage: CoverageSnapshot;
  editProblems: string[];
}): string {
  const problems = editProblems.length
    ? `\nProblems with your last attempt: ${editProblems.join(' · ')}`
    : '';
  return `Attempt ${attemptNumber} measured by the pipeline: ${describeCoverage(coverage)} → goal ${goal}% NOT reached.
Uncovered source lines: ${coverage.uncoveredLines}
${failingTestsSection(coverage)}${problems}
Continue from the current state of the files (they contain your previous edits). Cover the remaining lines, make every test pass, verify once with the same commands, then stop.`;
}
