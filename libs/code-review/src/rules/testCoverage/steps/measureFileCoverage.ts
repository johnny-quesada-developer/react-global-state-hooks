import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { runCommand } from '../../../shared/exec';
import type { RunArtifacts } from '../../../shared/runArtifacts';
import type { CoverageSnapshot } from '../TrackedFile';

export const TestMetadataSchema = z.object({
  runner: z.enum(['vitest', 'jest', 'other']),
  testEnvironment: z.string(),
  testIncludeGlobs: z.array(z.string()).min(1),
  coverageCommand: z.string().min(1),
  testingNotes: z.string(),
});

export type TestMetadata = z.infer<typeof TestMetadataSchema> & { projectRoot: string };

export class CoverageMeasurementError extends Error {}

const ALLOWED_RUNNERS = ['vitest', 'jest'];
const PACKAGE_RUNNER_PREFIXES = ['npx', 'yarn', 'pnpm', 'bunx'];
const SHELL_METACHARACTERS = /[;&|`$<>\\]/;
const NO_TESTS_FOUND = /no test files found|no tests found/i;
const EIGHT_MINUTES = 8 * 60 * 1000;

const REQUIRED_RUNNER_FLAGS: Record<string, string[]> = {
  vitest: ['--coverage.reportOnFailure'],
};

export function withRequiredRunnerFlags({ runner, args }: { runner: string; args: string[] }) {
  const missingFlags = (REQUIRED_RUNNER_FLAGS[runner] ?? []).filter(
    (flag) => !args.some((arg) => arg.startsWith(flag)),
  );
  return { runner, args: [...args, ...missingFlags] };
}

export function parseCoverageCommand(template: string): { runner: string; args: string[] } {
  if (SHELL_METACHARACTERS.test(template)) {
    throw new CoverageMeasurementError(
      'coverageCommand must not contain shell operators, variables or redirections',
    );
  }
  const hasRequiredPlaceholders = template.includes('{sourceFile}') && template.includes('{reportDir}');
  if (!hasRequiredPlaceholders) {
    throw new CoverageMeasurementError(
      'coverageCommand must use both {sourceFile} and {reportDir} placeholders',
    );
  }

  const tokens = template.trim().split(/\s+/);
  const withoutPackageRunner = PACKAGE_RUNNER_PREFIXES.includes(tokens[0]) ? tokens.slice(1) : tokens;
  const [runner, ...args] = withoutPackageRunner;
  if (!ALLOWED_RUNNERS.includes(runner)) {
    throw new CoverageMeasurementError(
      `coverageCommand must start with one of: ${ALLOWED_RUNNERS.join(', ')}`,
    );
  }
  return { runner, args: args.map((arg) => arg.replace(/^['"]|['"]$/g, '')) };
}

function resolveRunnerBinary({ runner, projectRoot }: { runner: string; projectRoot: string }): string {
  let directory = projectRoot;
  while (directory !== path.dirname(directory)) {
    const candidate = path.join(directory, 'node_modules', '.bin', runner);
    if (fs.existsSync(candidate)) return candidate;
    directory = path.dirname(directory);
  }
  throw new CoverageMeasurementError(`could not find node_modules/.bin/${runner} from ${projectRoot}`);
}

export function renderVerifyCommands({
  metadata,
  sourcePath,
}: {
  metadata: TestMetadata;
  sourcePath: string;
}): string[] {
  const { runner, args } = parseCoverageCommand(metadata.coverageCommand);
  const relativeSource = path.relative(metadata.projectRoot, sourcePath);
  const coverageArgs = args.map((arg) =>
    arg.replaceAll('{sourceFile}', relativeSource).replaceAll('{reportDir}', 'coverage-check'),
  );
  const testOnly =
    runner === 'vitest'
      ? `npx vitest related ${relativeSource} --run`
      : `npx jest --findRelatedTests ${relativeSource}`;
  return [testOnly, `npx ${runner} ${coverageArgs.join(' ')}`];
}

export async function measureFileCoverage({
  metadata,
  sourcePath,
  run,
}: {
  metadata: TestMetadata;
  sourcePath: string;
  run: RunArtifacts;
}): Promise<CoverageSnapshot> {
  const { runner, args } = withRequiredRunnerFlags(parseCoverageCommand(metadata.coverageCommand));
  const reportDirectory = run.newTemporaryDirectory(`coverage-${path.basename(sourcePath)}`);
  const relativeSource = path.relative(metadata.projectRoot, sourcePath);
  const renderedArgs = args.map((arg) =>
    arg.replaceAll('{sourceFile}', relativeSource).replaceAll('{reportDir}', reportDirectory),
  );

  const result = await runCommand({
    command: resolveRunnerBinary({ runner, projectRoot: metadata.projectRoot }),
    args: renderedArgs,
    cwd: metadata.projectRoot,
    timeoutMs: EIGHT_MINUTES,
    env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
  });
  const output = `${result.stdout}\n${result.stderr}`;
  const outputTail = output.trim().split('\n').slice(-40).join('\n');

  const summaryFile = path.join(reportDirectory, 'coverage-summary.json');
  if (!fs.existsSync(summaryFile)) {
    throw new CoverageMeasurementError(
      `no coverage-summary.json was written (exit ${result.exitCode}${result.timedOut ? ', timed out' : ''}):\n${outputTail}`,
    );
  }

  const summary: Record<string, IstanbulFileSummary> = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
  const fileSummary = findEntryForFile({ entries: summary, sourcePath });
  if (!fileSummary) {
    throw new CoverageMeasurementError(
      `coverage report does not include ${relativeSource}; check the include option`,
    );
  }

  const hasNoRelatedTests = NO_TESTS_FOUND.test(output);
  return {
    lines: Number(fileSummary.lines.pct) || 0,
    statements: Number(fileSummary.statements.pct) || 0,
    functions: Number(fileSummary.functions.pct) || 0,
    branches: Number(fileSummary.branches.pct) || 0,
    uncoveredLines: readUncoveredLines({ reportDirectory, sourcePath }),
    testsPassed: result.exitCode === 0 || hasNoRelatedTests,
    outputTail,
  };
}

function findEntryForFile<T>({
  entries,
  sourcePath,
}: {
  entries: Record<string, T>;
  sourcePath: string;
}): T | undefined {
  const realSource = fs.realpathSync(sourcePath);
  const matchingKey = Object.keys(entries).find(
    (key) => key !== 'total' && fs.existsSync(key) && fs.realpathSync(key) === realSource,
  );
  return matchingKey ? entries[matchingKey] : undefined;
}

type IstanbulMetric = { pct: number | string };

interface IstanbulFileSummary {
  lines: IstanbulMetric;
  statements: IstanbulMetric;
  functions: IstanbulMetric;
  branches: IstanbulMetric;
}

interface IstanbulFileCoverage {
  statementMap: Record<string, { start: { line: number } }>;
  s: Record<string, number>;
}

function readUncoveredLines({
  reportDirectory,
  sourcePath,
}: {
  reportDirectory: string;
  sourcePath: string;
}): string {
  const finalReport = path.join(reportDirectory, 'coverage-final.json');
  if (!fs.existsSync(finalReport)) return 'unknown (json reporter missing)';

  const fileCoverage = findEntryForFile<IstanbulFileCoverage>({
    entries: JSON.parse(fs.readFileSync(finalReport, 'utf8')),
    sourcePath,
  });
  if (!fileCoverage) return 'unknown';

  const uncovered = Object.entries(fileCoverage.s)
    .filter(([, hits]) => hits === 0)
    .map(([statementId]) => fileCoverage.statementMap[statementId].start.line);
  return toLineRanges([...new Set(uncovered)].sort((left, right) => left - right));
}

export function toLineRanges(lines: number[]): string {
  if (lines.length === 0) return 'none';
  const ranges: [number, number][] = [];
  lines.forEach((line) => {
    const lastRange = ranges.at(-1);
    const continuesLastRange = lastRange && line === lastRange[1] + 1;
    if (continuesLastRange) lastRange[1] = line;
    else ranges.push([line, line]);
  });
  return ranges.map(([start, end]) => (start === end ? `${start}` : `${start}-${end}`)).join(', ');
}
