import fs from 'node:fs';
import path from 'node:path';
import { describeHistory, type AttemptRecord } from '../../../graph/attemptHistory';
import { readIfExists, walkFiles } from '../../../shared/workspace';

export const PROJECT_CONTEXT_FILES = [
  'package.json',
  'project.json',
  'vitest.config.ts',
  'vitest.config.mts',
  'vitest.workspace.ts',
  'vite.config.ts',
  'jest.config.ts',
  'jest.config.js',
  'tsconfig.json',
];

const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;

export function findExampleTest(projectRoot: string): string | undefined {
  return walkFiles(projectRoot).find((file) => TEST_FILE.test(file));
}

export function buildMetadataPrompt({
  workspaceRoot,
  projectRoot,
  sampleSourceFile,
  history,
}: {
  workspaceRoot: string;
  projectRoot: string;
  sampleSourceFile: string;
  history: AttemptRecord[];
}): string {
  const contextFiles = PROJECT_CONTEXT_FILES.map((name) => path.join(projectRoot, name))
    .filter((file) => fs.existsSync(file))
    .map((file) => `--- ${path.basename(file)} ---\n${readIfExists(file, 4000)}`)
    .join('\n\n');

  const exampleTest = findExampleTest(projectRoot);
  const exampleSection = exampleTest
    ? `Existing test example (${path.relative(projectRoot, exampleTest)}):\n${readIfExists(exampleTest, 3000)}`
    : 'The project has no tests yet.';

  return `You collect deterministic test-execution metadata for ONE project inside a monorepo. Do not modify anything.

Workspace root: ${workspaceRoot}
Project root: ${path.relative(workspaceRoot, projectRoot) || '.'}
Sample source file: ${path.relative(projectRoot, sampleSourceFile)}

Project configuration files:
${contextFiles}

${exampleSection}

Fill these fields:
- runner: the test runner the project uses ("vitest", "jest" or "other").
- testEnvironment: e.g. "jsdom", "node", "happy-dom".
- testIncludeGlobs: the globs, relative to the project root, the runner uses to discover test files.
- coverageCommand: ONE command executed WITHOUT a shell with cwd = project root. It must run only the tests related to a single source file and write istanbul "json-summary" AND "json" coverage reports that include that source file (even when it has 0% coverage) into a directory.
  Use the placeholders {sourceFile} (path relative to project root) and {reportDir} (absolute directory). Start with the runner binary (vitest or jest). No pipes, &&, env vars or redirections.
  vitest example: vitest related {sourceFile} --run --coverage.enabled --coverage.reportOnFailure --coverage.provider=v8 --coverage.reporter=json-summary --coverage.reporter=json --coverage.include={sourceFile} --coverage.reportsDirectory={reportDir}
  jest example: jest --findRelatedTests {sourceFile} --coverage --coverageReporters=json-summary --coverageReporters=json --collectCoverageFrom={sourceFile} --coverageDirectory={reportDir} --passWithNoTests
- testingNotes: short, concrete notes a developer needs to write tests here (module aliases, setup files, globals enabled or not, available testing libraries such as @testing-library/react, how the project imports its own code).

Previous attempts and why they were rejected:
${describeHistory(history)}`;
}
