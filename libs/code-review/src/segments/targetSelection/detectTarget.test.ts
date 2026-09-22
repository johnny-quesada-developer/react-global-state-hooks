import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isPathInside } from '../../shared/isPathInside';
import { discoverNxProjects } from '../../shared/workspace';
import { detectTarget, type Target } from './detectTarget';
import { resolveTargetFiles } from './resolveTargetFiles';

const temporaryDirectories: string[] = [];

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => fs.rmSync(directory, { recursive: true, force: true }));
});

function createRepository(files: Record<string, string>): string {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'review-target-')));
  temporaryDirectories.push(root);
  writeFiles(root, files);
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, stdio: 'pipe' }).toString().trim();
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
      detectTarget({ value, workspaceRoot: root, invocationDirectory, projects: discoverNxProjects(root) });
    const filesOf = async (target: Target | undefined) =>
      (await resolveTargetFiles({ target: target!, workspaceRoot: root, repositoryRoot: root })).map((file) => path.relative(root, file));

    const fileTarget = await detect('src/cart.ts', path.join(root, 'apps/shop'));
    const folderTarget = await detect('apps/shop');
    const projectTarget = await detect('shop');
    const commitTarget = await detect(headCommit.slice(0, 10));
    const changesTarget = await detect('changes');
    const globTarget = await detect('apps/**/cart.*');

    expect(
      [fileTarget, folderTarget, projectTarget, commitTarget, changesTarget, globTarget].map((target) => target?.kind),
    ).toEqual(['file', 'folder', 'project', 'commit', 'workingChanges', 'glob']);
    expect(await detect('not-a-thing')).toBeUndefined();

    const shopSources = ['apps/shop/src/cart.ts', 'apps/shop/src/cart.tsx', 'apps/shop/src/checkout.ts'];
    expect(await filesOf(fileTarget)).toEqual(['apps/shop/src/cart.ts']);
    expect(await filesOf(folderTarget)).toEqual(shopSources);
    expect(await filesOf(projectTarget)).toEqual(shopSources);
    expect(await filesOf(commitTarget)).toEqual(['apps/shop/src/cart.ts', 'apps/shop/src/cart.tsx']);
    expect(await filesOf(changesTarget)).toEqual(['apps/shop/src/cart.ts', 'apps/shop/src/checkout.ts']);
    expect(await filesOf(globTarget)).toEqual(['apps/shop/src/cart.ts', 'apps/shop/src/cart.tsx']);
  });

  it('resolves commit and working-changes targets correctly when the configured workspace is nested inside a larger git repository', async () => {
    const root = createRepository({
      'outside.ts': 'export const outside = 1;',
      'nested/inside.ts': 'export const inside = 1;',
    });
    const nestedWorkspaceRoot = path.join(root, 'nested');
    writeFiles(root, { 'outside.ts': 'export const outside = 2;', 'nested/inside.ts': 'export const inside = 2;', 'nested/added.ts': 'export const added = 1;' });

    const changed = await resolveTargetFiles({ target: { kind: 'workingChanges' }, workspaceRoot: nestedWorkspaceRoot, repositoryRoot: root });
    // git ran from the true repo root and results were filtered to the nested workspace only —
    // the sibling change to outside.ts (outside the workspace) must not leak in.
    expect(changed.map((file) => path.relative(root, file)).sort()).toEqual(['nested/added.ts', 'nested/inside.ts']);
    changed.forEach((file) => expect(isPathInside({ child: file, parent: nestedWorkspaceRoot })).toBe(true));
  });

  it('supports project targets from explicit settings.projects with no nx.json at all (plain, non-Nx repo)', async () => {
    const root = createRepository({
      'package.json': '{"name":"plain-repo","private":true}',
      'services/api/index.ts': 'export const api = 1;',
      'services/api/helper.ts': 'export const helper = 1;',
    });
    expect(discoverNxProjects(root)).toEqual([]);

    const explicitProjects = [{ name: 'api', root: path.join(root, 'services/api'), sourceRoot: path.join(root, 'services/api') }];
    const target = await detectTarget({ value: 'api', workspaceRoot: root, invocationDirectory: root, projects: explicitProjects });
    expect(target).toEqual({ kind: 'project', project: explicitProjects[0] });

    const files = await resolveTargetFiles({ target: target!, workspaceRoot: root, repositoryRoot: root });
    expect(files.map((file) => path.relative(root, file)).sort()).toEqual(['services/api/helper.ts', 'services/api/index.ts']);
  });
});

describe('isPathInside', () => {
  it('treats the same directory as inside, nested paths as inside, and siblings/parents as outside', () => {
    expect(isPathInside({ child: '/repo/a', parent: '/repo/a' })).toBe(true);
    expect(isPathInside({ child: '/repo/a/b.ts', parent: '/repo/a' })).toBe(true);
    expect(isPathInside({ child: '/repo/b', parent: '/repo/a' })).toBe(false);
    expect(isPathInside({ child: '/repo', parent: '/repo/a' })).toBe(false);
  });
});
