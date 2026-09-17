import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { listNxProjects } from '../../shared/workspace';
import { detectTarget, type Target } from './detectTarget';
import { resolveTargetFiles } from './resolveTargetFiles';

const temporaryDirectories: string[] = [];

afterEach(() => {
  temporaryDirectories
    .splice(0)
    .forEach((directory) => fs.rmSync(directory, { recursive: true, force: true }));
});

function createRepository(files: Record<string, string>): string {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'review-target-')));
  temporaryDirectories.push(root);
  writeFiles(root, files);
  const git = (...args: string[]) =>
    execFileSync('git', args, { cwd: root, stdio: 'pipe' }).toString().trim();
  git('init', '-q');
  git('-c', 'user.email=test@example.com', '-c', 'user.name=test', 'add', '.');
  git('-c', 'user.email=test@example.com', '-c', 'user.name=test', 'commit', '-qm', 'initial');
  return root;
}

function writeFiles(root: string, files: Record<string, string>) {
  Object.entries(files).forEach(([file, content]) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  });
}

describe('target selection', () => {
  it('detects every target kind deterministically and resolves them to reviewable source files', async () => {
    const root = createRepository({
      'nx.json': '{}',
      'apps/shop/project.json': JSON.stringify({ name: 'shop', sourceRoot: 'apps/shop/src' }),
      'apps/shop/src/cart.ts': 'export const cart = 1;',
      'apps/shop/src/cart.tsx': 'export const CartView = () => null;',
      'apps/shop/src/styles.css': 'body {}',
      'apps/shop/src/node_modules/dep/index.ts': 'export {}',
      'apps/shop/README.md': '# shop',
    });
    const headCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root }).toString().trim();
    writeFiles(root, {
      'apps/shop/src/checkout.ts': 'export const checkout = 2;',
      'apps/shop/src/cart.ts': 'export const cart = 3;',
    });

    const detect = (value: string, invocationDirectory = root) =>
      detectTarget({ value, workspaceRoot: root, invocationDirectory, projects: listNxProjects(root) });
    const filesOf = async (target: Target | undefined) =>
      (await resolveTargetFiles({ target: target!, workspaceRoot: root })).map((file) =>
        path.relative(root, file),
      );

    const fileTarget = await detect('src/cart.ts', path.join(root, 'apps/shop'));
    const folderTarget = await detect('apps/shop');
    const projectTarget = await detect('shop');
    const commitTarget = await detect(headCommit.slice(0, 10));
    const changesTarget = await detect('changes');
    const globTarget = await detect('apps/**/cart.*');

    expect(
      [fileTarget, folderTarget, projectTarget, commitTarget, changesTarget, globTarget].map(
        (target) => target?.kind,
      ),
    ).toEqual(['file', 'folder', 'nxProject', 'commit', 'workingChanges', 'glob']);
    expect(await detect('not-a-thing')).toBeUndefined();

    const shopSources = ['apps/shop/src/cart.ts', 'apps/shop/src/cart.tsx', 'apps/shop/src/checkout.ts'];
    expect(await filesOf(fileTarget)).toEqual(['apps/shop/src/cart.ts']);
    expect(await filesOf(folderTarget)).toEqual(shopSources);
    expect(await filesOf(projectTarget)).toEqual(shopSources);
    expect(await filesOf(commitTarget)).toEqual(['apps/shop/src/cart.ts', 'apps/shop/src/cart.tsx']);
    expect(await filesOf(changesTarget)).toEqual(['apps/shop/src/cart.ts', 'apps/shop/src/checkout.ts']);
    expect(await filesOf(globTarget)).toEqual(['apps/shop/src/cart.ts', 'apps/shop/src/cart.tsx']);
  });
});
