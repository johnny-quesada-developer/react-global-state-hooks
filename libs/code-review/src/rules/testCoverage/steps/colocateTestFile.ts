import fs from 'node:fs';
import path from 'node:path';
import { minimatch } from 'minimatch';
import { renderTestSkeleton } from './homologateFileDomain';
import type { TestMetadata } from './measureFileCoverage';
import type { TestSuffix } from './testNaming';

export interface TestFilePlan {
  testPath: string;
}

export interface PlacementResult {
  sourcePath: string;
  testPath: string;
  changedFiles: string[];
  unprocessableReason?: string;
}

export const defaultColocatedTestPath = ({ sourcePath, suffix }: { sourcePath: string; suffix: TestSuffix }): string => {
  const extension = path.extname(sourcePath);
  const baseName = path.basename(sourcePath, extension);
  const isJavaScript = ['.js', '.jsx', '.mjs', '.cjs'].includes(extension) && !['.tsx'].includes(extension);
  const testExtension = extension === '.tsx' || extension === '.jsx' ? extension : isJavaScript ? '.js' : '.ts';
  return path.join(path.dirname(sourcePath), `${baseName}.${suffix}${testExtension}`);
};

/**
 * The "no source movement" test layout: the source file's path and existing imports are left
 * completely untouched — a sibling `x.<suffix>.ts` is created next to `x.ts` if it doesn't
 * already exist. This is the alternative to `homologateFileDomain`'s domain-folder move.
 */
export async function colocateTestFile({
  sourcePath,
  suffix,
  metadata,
  plan,
}: {
  sourcePath: string;
  suffix: TestSuffix;
  metadata: TestMetadata;
  plan?: TestFilePlan;
}): Promise<PlacementResult> {
  const testPath = plan?.testPath ?? defaultColocatedTestPath({ sourcePath, suffix });
  const relativeTestPath = path.relative(metadata.projectRoot, testPath);
  const isDiscoveredByRunner = metadata.testIncludeGlobs.some((glob) => minimatch(relativeTestPath, glob));
  if (!isDiscoveredByRunner) {
    return {
      sourcePath,
      testPath,
      changedFiles: [],
      unprocessableReason: `${relativeTestPath} would not be picked up by the runner (include: ${metadata.testIncludeGlobs.join(', ')})`,
    };
  }

  const needsSkeleton = !fs.existsSync(testPath);
  if (needsSkeleton) {
    fs.mkdirSync(path.dirname(testPath), { recursive: true });
    fs.writeFileSync(testPath, renderTestSkeleton({ baseName: path.basename(sourcePath, path.extname(sourcePath)), runner: metadata.runner }));
  }

  return { sourcePath, testPath, changedFiles: needsSkeleton ? [testPath] : [] };
}
