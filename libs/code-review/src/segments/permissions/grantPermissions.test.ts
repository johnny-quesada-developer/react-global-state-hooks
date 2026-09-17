import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { toAllowedTools } from '../../providers/claudeProvider';
import { annotateFailure } from '../../shared/annotateFailure';
import { buildGrant } from './grantPermissions';

const temporaryDirectories: string[] = [];

afterEach(() => {
  temporaryDirectories
    .splice(0)
    .forEach((directory) => fs.rmSync(directory, { recursive: true, force: true }));
});

const createWorkspace = (files: Record<string, string>) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'review-grant-'));
  temporaryDirectories.push(root);
  Object.entries(files).forEach(([file, content]) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  });
  return { root, at: (file: string) => path.join(root, file) };
};

describe('permission grants', () => {
  it('turns the chosen scope into provider rules the CLI enforces, and annotates failed files idempotently', () => {
    const workspace = createWorkspace({
      'nx.json': '{}',
      'apps/shop/package.json': '{}',
      'apps/shop/src/cart.ts': '',
      'libs/core/package.json': '{}',
      'libs/core/src/a.ts': '',
      'libs/core/src/b.ts': '',
    });
    const files = ['apps/shop/src/cart.ts', 'libs/core/src/a.ts', 'libs/core/src/b.ts'].map(workspace.at);
    const bashPatterns = ['yarn vitest *', 'git diff *'];

    const projects = buildGrant({ scope: 'projects', files, workspaceRoot: workspace.root, bashPatterns });
    expect(projects.editDirectories).toEqual([workspace.at('apps/shop'), workspace.at('libs/core')]);
    expect(toAllowedTools({ grant: projects, workspaceRoot: workspace.root })).toEqual([
      'Edit(apps/shop/**)',
      'Write(apps/shop/**)',
      'Edit(libs/core/**)',
      'Write(libs/core/**)',
      'Bash(yarn vitest *)',
      'Bash(git diff *)',
    ]);

    const whole = buildGrant({ scope: 'workspace', files, workspaceRoot: workspace.root, bashPatterns });
    expect(whole.editDirectories).toEqual([workspace.root]);
    expect(toAllowedTools({ grant: whole, workspaceRoot: workspace.root }).slice(0, 2)).toEqual([
      'Edit',
      'Write',
    ]);

    const file = workspace.at('libs/core/src/a.ts');
    fs.writeFileSync(file, 'export const a = 1;\n');
    expect(
      annotateFailure({ file, ruleId: 'test-coverage', reason: 'goal not reached\nafter 3 attempts' }),
    ).toBe(true);
    expect(annotateFailure({ file, ruleId: 'test-coverage', reason: 'second reason' })).toBe(true);
    expect(fs.readFileSync(file, 'utf8')).toBe(
      '// [TODO] code-review(test-coverage): second reason\nexport const a = 1;\n',
    );
    expect(annotateFailure({ file: workspace.at('missing.ts'), ruleId: 'x', reason: 'y' })).toBe(false);
  });
});
