import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findUntestableReason } from './discardUntestableFiles';
import { flagSignals, inspectTestFile } from './inspectTestFile';
import { parseCoverageCommand, toLineRanges, withRequiredRunnerFlags } from './measureFileCoverage';

const temporaryDirectories: string[] = [];

afterEach(() => {
  temporaryDirectories
    .splice(0)
    .forEach((directory) => fs.rmSync(directory, { recursive: true, force: true }));
});

function writeProject(files: Record<string, string>): (file: string) => string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'review-static-'));
  temporaryDirectories.push(root);
  Object.entries(files).forEach(([file, content]) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  });
  return (file) => path.join(root, file);
}

describe('deterministic checks of the coverage rule', () => {
  it('discards files that cannot be meaningfully unit tested and keeps runtime modules', () => {
    const fileAt = writeProject({
      'src/types.ts': 'export type Id = string;\nexport interface User {\n  id: Id;\n}\n',
      'src/index.ts':
        "export * from './store';\nexport { default as Button, type ButtonProps } from './Button';\n",
      'src/env.d.ts': 'declare const VERSION: string;',
      'src/store.test.ts': "it('works', () => {});",
      'src/__tests__/helpers.ts': 'export const helper = () => 1;',
      'vite.config.ts': 'export default {};',
      'src/main.tsx':
        "import { createRoot } from 'react-dom/client';\ncreateRoot(document.body).render(null);",
      'src/Button.stories.tsx': 'export default {};',
      'src/store.ts': '// state store\nexport const createStore = () => ({ value: 1 });',
      'src/Button.tsx': 'export default function Button() { return null; }',
      'src/constants.ts': 'export const LIMIT = 3;',
    });

    const reasons = Object.fromEntries(
      [
        'src/types.ts',
        'src/index.ts',
        'src/env.d.ts',
        'src/store.test.ts',
        'src/__tests__/helpers.ts',
        'vite.config.ts',
        'src/main.tsx',
        'src/Button.stories.tsx',
        'src/store.ts',
        'src/Button.tsx',
        'src/constants.ts',
      ].map((file) => [file, findUntestableReason(fileAt(file))]),
    );

    expect(reasons).toEqual({
      'src/types.ts': 'types-only module',
      'src/index.ts': 'barrel file (re-exports only)',
      'src/env.d.ts': 'type declaration file',
      'src/store.test.ts': 'test file',
      'src/__tests__/helpers.ts': 'test file',
      'vite.config.ts': 'config or setup file',
      'src/main.tsx': 'application bootstrap entry',
      'src/Button.stories.tsx': 'story file',
      'src/store.ts': undefined,
      'src/Button.tsx': undefined,
      'src/constants.ts': undefined,
    });
  });

  it('extracts test signals, flags blocking isolation problems and guards the AI-provided coverage command', () => {
    const leakyTest = `
      vi.mock('../store');
      vi.mock('axios');
      beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('fetch', vi.fn()); });
      it('one', () => { expect(1).toBe(1); });
      it('two', () => { expect(2).toBe(2); });
    `;
    const cleanTest = `
      afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals(); });
      it('walks the whole flow', () => { vi.useFakeTimers(); vi.stubGlobal('fetch', vi.fn()); expect(1).toBe(1); expect(2).toBe(2); });
    `;

    const leakySignals = inspectTestFile(leakyTest);
    expect(leakySignals).toMatchObject({
      testCount: 2,
      assertionsPerTest: 1,
      ownCodeMocks: ['../store'],
      externalMocks: ['axios'],
    });
    expect(flagSignals(leakySignals).map(({ flag, isBlocking }) => `${flag}:${isBlocking}`)).toEqual([
      'globalsNotRestored:true',
      'fakeTimersNotRestored:true',
      'mocksOwnCode:false',
      'sparseTests:false',
    ]);
    expect(flagSignals(inspectTestFile(cleanTest))).toEqual([]);

    expect(
      parseCoverageCommand('yarn vitest related {sourceFile} --run --coverage.reportsDirectory={reportDir}'),
    ).toEqual({
      runner: 'vitest',
      args: ['related', '{sourceFile}', '--run', '--coverage.reportsDirectory={reportDir}'],
    });
    expect(() => parseCoverageCommand('vitest run {sourceFile} {reportDir} && rm -rf /')).toThrow(
      /shell operators/,
    );
    expect(() => parseCoverageCommand('node run.js {sourceFile} {reportDir}')).toThrow(
      /must start with one of/,
    );
    expect(() => parseCoverageCommand('vitest run --coverage')).toThrow(/placeholders/);

    expect(withRequiredRunnerFlags({ runner: 'vitest', args: ['related', '{sourceFile}'] }).args).toEqual([
      'related',
      '{sourceFile}',
      '--coverage.reportOnFailure',
    ]);
    expect(withRequiredRunnerFlags({ runner: 'jest', args: ['--coverage'] }).args).toEqual(['--coverage']);

    expect(toLineRanges([3, 4, 5, 9, 11, 12])).toBe('3-5, 9, 11-12');
    expect(toLineRanges([])).toBe('none');
  });
});
