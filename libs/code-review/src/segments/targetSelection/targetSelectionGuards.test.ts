import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createTestContext } from '../../testSupport/createTestContext';
import { selectTarget } from './targetSelectionGraph';

const temporaryDirectories: string[] = [];

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => fs.rmSync(directory, { recursive: true, force: true }));
});

function createRepository() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'review-guards-')));
  temporaryDirectories.push(root);
  ['a', 'b', 'c'].forEach((name) => {
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    fs.writeFileSync(path.join(root, 'src', `${name}.ts`), `export const ${name} = 1;\n`);
  });
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
  git('init', '-q');
  git('-c', 'user.email=t@e.c', '-c', 'user.name=t', 'add', '.');
  git('-c', 'user.email=t@e.c', '-c', 'user.name=t', 'commit', '-qm', 'initial');
  return root;
}

describe('target selection guards', () => {
  it('refuses a dirty working tree unless --allow-dirty, and ignores the tool\'s own .review folder', async () => {
    const root = createRepository();
    const context = createTestContext({ workspaceRoot: root, options: { targets: ['src/a.ts'], allowDirty: false } });
    context.run.writeText('probe.txt', 'the run folder is untracked but must not count as dirty');

    await expect(selectTarget(context)).resolves.toMatchObject({ files: [path.join(root, 'src/a.ts')] });

    fs.writeFileSync(path.join(root, 'src/b.ts'), 'export const b = 2;\n');
    await expect(selectTarget(context)).rejects.toThrow(/uncommitted change.*--allow-dirty/);

    const allowed = createTestContext({ workspaceRoot: root, options: { targets: ['src/a.ts'], allowDirty: true } });
    await expect(selectTarget(allowed)).resolves.toMatchObject({ files: [path.join(root, 'src/a.ts')] });
  });

  it('aborts when the target resolves to more files than --max-files', async () => {
    const root = createRepository();
    const tooMany = createTestContext({ workspaceRoot: root, options: { targets: ['src'], maxFiles: 2 } });
    await expect(selectTarget(tooMany)).rejects.toThrow(/3 files, above --max-files 2/);

    const withinLimit = createTestContext({ workspaceRoot: root, options: { targets: ['src'], maxFiles: 3 } });
    await expect(selectTarget(withinLimit)).resolves.toMatchObject({ files: expect.arrayContaining([]) });
  });
});
