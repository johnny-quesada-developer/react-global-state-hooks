import fs from 'node:fs';
import path from 'node:path';
import type { Ask } from '../../../shared/ask';
import { walkFiles } from '../../../shared/workspace';

export type TestSuffix = 'test' | 'spec';

const TEST_SUFFIXES: TestSuffix[] = ['test', 'spec'];
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;

export function countTestSuffixes(projectRoots: string[]): Record<TestSuffix, number> {
  const testFiles = projectRoots.flatMap(walkFiles).filter((file) => TEST_FILE.test(file));
  return {
    test: testFiles.filter((file) => file.match(TEST_FILE)?.[1] === 'test').length,
    spec: testFiles.filter((file) => file.match(TEST_FILE)?.[1] === 'spec').length,
  };
}

export async function chooseTestSuffix({
  projectRoots,
  ask,
  requestedSuffix,
}: {
  projectRoots: string[];
  ask: Ask;
  requestedSuffix?: string;
}): Promise<TestSuffix> {
  const isValidRequest = TEST_SUFFIXES.includes(requestedSuffix as TestSuffix);
  if (isValidRequest) return requestedSuffix as TestSuffix;

  const counts = countTestSuffixes(projectRoots);
  const detectedSuffixes = TEST_SUFFIXES.filter((suffix) => counts[suffix] > 0).sort(
    (left, right) => counts[right] - counts[left],
  );
  const hasConvention = detectedSuffixes.length > 0;

  return ask.select<TestSuffix>({
    message: hasConvention
      ? 'New test files naming (detected from existing tests)'
      : 'No existing tests found. How should new test files be named?',
    defaultValue: hasConvention ? detectedSuffixes[0] : 'test',
    choices: (hasConvention ? detectedSuffixes : TEST_SUFFIXES).map((suffix) => ({
      value: suffix,
      label: `file.${suffix}.ts`,
      hint: hasConvention ? `${counts[suffix]} existing file(s)` : undefined,
    })),
  });
}

export function findDedicatedTestFile(sourcePath: string): string | undefined {
  const directory = path.dirname(sourcePath);
  const baseName = path.basename(sourcePath, path.extname(sourcePath));
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];

  const candidates = TEST_SUFFIXES.flatMap((suffix) =>
    extensions.flatMap((extension) => [
      path.join(directory, `${baseName}.${suffix}${extension}`),
      path.join(directory, '__tests__', `${baseName}.${suffix}${extension}`),
    ]),
  );
  return candidates.find((candidate) => fs.existsSync(candidate));
}
