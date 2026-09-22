import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { homologateFileDomain } from './homologateFileDomain';
import type { TestMetadata } from './measureFileCoverage';

const temporaryDirectories: string[] = [];

afterEach(() => {
  temporaryDirectories
    .splice(0)
    .forEach((directory) => fs.rmSync(directory, { recursive: true, force: true }));
});

function createRepository(files: Record<string, string>) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'review-homologate-')));
  temporaryDirectories.push(root);
  Object.entries(files).forEach(([file, content]) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  });
  execFileSync('git', ['init', '-q'], { cwd: root });
  return {
    root,
    at: (file: string) => path.join(root, file),
    read: (file: string) => fs.readFileSync(path.join(root, file), 'utf8'),
    exists: (file: string) => fs.existsSync(path.join(root, file)),
  };
}

const vitestMetadata = (
  projectRoot: string,
  testIncludeGlobs = ['src/**/*.{test,spec}.{ts,tsx}'],
): TestMetadata => ({
  projectRoot,
  runner: 'vitest',
  testEnvironment: 'node',
  testIncludeGlobs,
  coverageCommand: 'vitest related {sourceFile} --coverage.reportsDirectory={reportDir}',
  testingNotes: '',
});

describe('homologateFileDomain', () => {
  it('moves the file into its own domain and updates every reference so the repository stays valid', async () => {
    const repository = createRepository({
      'libs/core/package.json': '{"name": "core"}',
      'libs/core/esbuild.config.ts':
        "const entryPoints = { isRecord: 'src/isRecord.ts', legacy: 'src/legacy/isRecord.ts' };",
      'libs/core/tsconfig.json':
        '{ "compilerOptions": { "paths": { "core/isRecord": ["./src/isRecord.ts"] } } }',
      'libs/core/src/isRecord.ts':
        "import { kind } from './kind';\nexport default function isRecord(value: unknown) { return kind(value) === 'object'; }\n",
      'libs/core/src/kind.ts': 'export const kind = (value: unknown) => typeof value;\n',
      'libs/core/src/withExtension.ts': "export { default } from './isRecord.ts';\n",
      'libs/core/src/extensionless.ts': "export { default } from './isRecord';\n",
      'libs/core/src/legacy/isRecord.ts': 'export const legacy = true;\n',
      'libs/core/src/legacy/consumer.ts': "import { legacy } from './isRecord.ts';\n",
      'apps/web/src/usesAlias.ts': "import isRecord from '@core/src/isRecord.ts';\n",
      'docs/architecture.md': 'The guard lives in `libs/core/src/isRecord.ts`.\n',
    });

    const result = await homologateFileDomain({
      sourcePath: repository.at('libs/core/src/isRecord.ts'),
      suffix: 'spec',
      metadata: vitestMetadata(repository.at('libs/core')),
      workspaceRoot: repository.root,
    });

    expect(result.unprocessableReason).toBeUndefined();
    expect(result.sourcePath).toBe(repository.at('libs/core/src/isRecord/isRecord.ts'));
    expect(result.testPath).toBe(repository.at('libs/core/src/isRecord/isRecord.spec.ts'));
    expect(repository.exists('libs/core/src/isRecord.ts')).toBe(false);
    expect(repository.read('libs/core/src/isRecord/isRecord.ts')).toContain(
      "import { kind } from '../kind';",
    );
    expect(repository.read('libs/core/src/isRecord/index.ts')).toBe(
      "export * from './isRecord';\nexport { default } from './isRecord';\n",
    );
    expect(repository.read('libs/core/src/isRecord/isRecord.spec.ts')).toContain(
      "it.todo('covers the behavior of isRecord')",
    );

    expect(repository.read('libs/core/esbuild.config.ts')).toBe(
      "const entryPoints = { isRecord: 'src/isRecord/isRecord.ts', legacy: 'src/legacy/isRecord.ts' };",
    );
    expect(repository.read('libs/core/tsconfig.json')).toContain('["./src/isRecord/isRecord.ts"]');
    expect(repository.read('libs/core/src/withExtension.ts')).toBe(
      "export { default } from './isRecord/isRecord.ts';\n",
    );
    expect(repository.read('apps/web/src/usesAlias.ts')).toBe(
      "import isRecord from '@core/src/isRecord/isRecord.ts';\n",
    );
    expect(repository.read('docs/architecture.md')).toContain('`libs/core/src/isRecord/isRecord.ts`');
    expect(repository.read('libs/core/src/extensionless.ts')).toBe("export { default } from './isRecord';\n");
    expect(repository.read('libs/core/src/legacy/consumer.ts')).toBe(
      "import { legacy } from './isRecord.ts';\n",
    );

    const relativeChangedFiles = result.changedFiles
      .map((file) => path.relative(repository.root, file))
      .sort();
    expect(relativeChangedFiles).toEqual([
      'apps/web/src/usesAlias.ts',
      'docs/architecture.md',
      'libs/core/esbuild.config.ts',
      'libs/core/src/isRecord.ts',
      'libs/core/src/isRecord/index.ts',
      'libs/core/src/isRecord/isRecord.spec.ts',
      'libs/core/src/isRecord/isRecord.ts',
      'libs/core/src/withExtension.ts',
      'libs/core/tsconfig.json',
    ]);
  });

  it('keeps files that already own their domain in place and refuses moves the runner could not test or that collide', async () => {
    const repository = createRepository({
      'app/package.json': '{}',
      'app/src/Badge/Badge.tsx': 'export const Badge = () => null;\n',
      'app/src/outside.ts': 'export const outside = 1;\n',
      'app/src/cart.ts': 'export const cart = 1;\n',
      'app/src/cart/cart.ts': 'export const nestedCart = 1;\n',
    });
    const metadata = vitestMetadata(repository.at('app'));

    const inPlace = await homologateFileDomain({
      sourcePath: repository.at('app/src/Badge/Badge.tsx'),
      suffix: 'test',
      metadata,
      workspaceRoot: repository.root,
    });
    expect(inPlace).toMatchObject({
      sourcePath: repository.at('app/src/Badge/Badge.tsx'),
      testPath: repository.at('app/src/Badge/Badge.test.tsx'),
      referenceUpdates: [],
    });
    expect(repository.exists('app/src/Badge/index.ts')).toBe(false);
    expect(repository.exists('app/src/Badge/Badge.test.tsx')).toBe(true);

    const notDiscovered = await homologateFileDomain({
      sourcePath: repository.at('app/src/outside.ts'),
      suffix: 'test',
      metadata: vitestMetadata(repository.at('app'), ['test/**/*.test.ts']),
      workspaceRoot: repository.root,
    });
    expect(notDiscovered.unprocessableReason).toContain('would not be picked up by the runner');
    expect(repository.exists('app/src/outside.ts')).toBe(true);

    const collision = await homologateFileDomain({
      sourcePath: repository.at('app/src/cart.ts'),
      suffix: 'test',
      metadata,
      workspaceRoot: repository.root,
    });
    expect(collision.unprocessableReason).toContain('already exists');
    expect(repository.read('app/src/cart.ts')).toBe('export const cart = 1;\n');
  });
});
