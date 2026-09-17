import fs from 'node:fs';
import path from 'node:path';
import { minimatch } from 'minimatch';
import type { TestMetadata } from './measureFileCoverage';
import type { TestSuffix } from './testNaming';
import {
  findFilesReferencing,
  updateMovedFileReferences,
  type ReferenceUpdate,
} from './updateMovedFileReferences';

export interface HomologationResult {
  sourcePath: string;
  testPath: string;
  changedFiles: string[];
  referenceUpdates: ReferenceUpdate[];
  unprocessableReason?: string;
}

const RELATIVE_SPECIFIER =
  /((?:from\s+|import\s*\(\s*|require\s*\(\s*|vi\.mock\s*\(\s*|jest\.mock\s*\(\s*)['"])(\.{1,2}\/[^'"]*)(['"])/g;

export function planDomainPaths({ sourcePath, suffix }: { sourcePath: string; suffix: TestSuffix }) {
  const extension = path.extname(sourcePath);
  const baseName = path.basename(sourcePath, extension);
  const parentDirectory = path.dirname(sourcePath);
  const hasOwnDomain = path.basename(parentDirectory) === baseName;
  const domainDirectory = hasOwnDomain ? parentDirectory : path.join(parentDirectory, baseName);
  const isJsx = extension === '.tsx' || extension === '.jsx';
  const isJavaScript = ['.js', '.jsx', '.mjs', '.cjs'].includes(extension);
  const testExtension = isJsx ? extension : isJavaScript ? '.js' : '.ts';

  return {
    baseName,
    hasOwnDomain,
    domainDirectory,
    domainSourcePath: path.join(domainDirectory, `${baseName}${extension}`),
    indexPath: path.join(domainDirectory, isJavaScript ? 'index.js' : 'index.ts'),
    testPath: path.join(domainDirectory, `${baseName}.${suffix}${testExtension}`),
  };
}

export async function homologateFileDomain({
  sourcePath,
  suffix,
  metadata,
  workspaceRoot,
}: {
  sourcePath: string;
  suffix: TestSuffix;
  metadata: TestMetadata;
  workspaceRoot: string;
}): Promise<HomologationResult> {
  const plan = planDomainPaths({ sourcePath, suffix });
  const unprocessable = (reason: string): HomologationResult => ({
    sourcePath,
    testPath: plan.testPath,
    changedFiles: [],
    referenceUpdates: [],
    unprocessableReason: reason,
  });

  const relativeTestPath = path.relative(metadata.projectRoot, plan.testPath);
  const isDiscoveredByRunner = metadata.testIncludeGlobs.some((glob) => minimatch(relativeTestPath, glob));
  if (!isDiscoveredByRunner) {
    return unprocessable(
      `${relativeTestPath} would not be picked up by the runner (include: ${metadata.testIncludeGlobs.join(', ')})`,
    );
  }

  const domainPathIsTaken =
    !plan.hasOwnDomain && (fs.existsSync(plan.domainSourcePath) || isExistingFile(plan.domainDirectory));
  if (domainPathIsTaken) {
    return unprocessable(
      `cannot create the domain folder, ${path.relative(workspaceRoot, plan.domainSourcePath)} already exists`,
    );
  }

  const move = plan.hasOwnDomain ? emptyMove() : await moveIntoDomain({ sourcePath, plan, workspaceRoot });

  const needsTestSkeleton = !fs.existsSync(plan.testPath);
  if (needsTestSkeleton)
    fs.writeFileSync(plan.testPath, renderTestSkeleton({ baseName: plan.baseName, runner: metadata.runner }));

  return {
    sourcePath: plan.domainSourcePath,
    testPath: plan.testPath,
    changedFiles: [...move.changedFiles, ...(needsTestSkeleton ? [plan.testPath] : [])],
    referenceUpdates: move.referenceUpdates,
  };
}

const isExistingFile = (file: string) => fs.existsSync(file) && !fs.statSync(file).isDirectory();

const emptyMove = () => ({ changedFiles: [] as string[], referenceUpdates: [] as ReferenceUpdate[] });

async function moveIntoDomain({
  sourcePath,
  plan,
  workspaceRoot,
}: {
  sourcePath: string;
  plan: ReturnType<typeof planDomainPaths>;
  workspaceRoot: string;
}) {
  const referencingFiles = await findFilesReferencing({ filePath: sourcePath, workspaceRoot });
  const originalContent = fs.readFileSync(sourcePath, 'utf8');

  fs.mkdirSync(plan.domainDirectory, { recursive: true });
  fs.writeFileSync(
    plan.domainSourcePath,
    rewriteRelativeImports({
      content: originalContent,
      fromDirectory: path.dirname(sourcePath),
      toDirectory: plan.domainDirectory,
    }),
  );
  fs.rmSync(sourcePath);

  const needsIndex = !fs.existsSync(plan.indexPath);
  if (needsIndex) {
    fs.writeFileSync(
      plan.indexPath,
      renderIndex({ baseName: plan.baseName, hasDefaultExport: /export\s+default\b/.test(originalContent) }),
    );
  }

  const referenceUpdates = updateMovedFileReferences({
    referencingFiles,
    oldPath: sourcePath,
    newPath: plan.domainSourcePath,
    workspaceRoot,
  });
  const updatedReferencingFiles = [...new Set(referenceUpdates.map(({ file }) => file))];

  return {
    changedFiles: [
      sourcePath,
      plan.domainSourcePath,
      ...(needsIndex ? [plan.indexPath] : []),
      ...updatedReferencingFiles,
    ],
    referenceUpdates,
  };
}

export function rewriteRelativeImports({
  content,
  fromDirectory,
  toDirectory,
}: {
  content: string;
  fromDirectory: string;
  toDirectory: string;
}): string {
  return content.replace(RELATIVE_SPECIFIER, (_match, prefix: string, specifier: string, quote: string) => {
    const target = path.resolve(fromDirectory, specifier);
    const rewritten = path.relative(toDirectory, target).split(path.sep).join('/');
    const withDotPrefix = rewritten.startsWith('.') ? rewritten : `./${rewritten}`;
    return `${prefix}${withDotPrefix}${quote}`;
  });
}

const renderIndex = ({ baseName, hasDefaultExport }: { baseName: string; hasDefaultExport: boolean }) =>
  [
    `export * from './${baseName}';`,
    hasDefaultExport ? `export { default } from './${baseName}';` : undefined,
  ]
    .filter(Boolean)
    .join('\n')
    .concat('\n');

function renderTestSkeleton({
  baseName,
  runner,
}: {
  baseName: string;
  runner: TestMetadata['runner'];
}): string {
  const runnerImport = runner === 'vitest' ? "import { describe, it } from 'vitest';\n\n" : '';
  return `${runnerImport}describe('${baseName}', () => {\n  it.todo('covers the behavior of ${baseName}');\n});\n`;
}
