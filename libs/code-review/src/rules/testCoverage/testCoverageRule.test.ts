import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFakeProvider, defaultFakeAnalyzeResponders } from '../../providers/fakeProvider';
import type { ReviewContext } from '../../pipeline/ReviewContext';
import { scriptedAsk } from '../../shared/ask';
import { silentLogger } from '../../shared/logger';
import { createRunArtifacts } from '../../shared/runArtifacts';
import { testCoverageRule } from './testCoverageRule';

const workspaceNodeModules = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../../node_modules',
);
const temporaryDirectories: string[] = [];

afterEach(() => {
  temporaryDirectories
    .splice(0)
    .forEach((directory) => fs.rmSync(directory, { recursive: true, force: true }));
});

function createVitestWorkspace(files: Record<string, string>) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'review-rule-')));
  temporaryDirectories.push(root);
  fs.symlinkSync(workspaceNodeModules, path.join(root, 'node_modules'), 'dir');
  Object.entries(files).forEach(([file, content]) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  });
  execFileSync('git', ['init', '-q'], { cwd: root });
  fs.writeFileSync(path.join(root, '.gitignore'), 'node_modules\n.review\n');
  return {
    root,
    at: (file: string) => path.join(root, file),
    read: (file: string) => fs.readFileSync(path.join(root, file), 'utf8'),
  };
}

const MATH_TEST = `import { describe, expect, it } from 'vitest';
import { add, clamp } from './math';

describe('math', () => {
  it('adds and clamps values through every branch', () => {
    expect(add(1, 2)).toBe(3);
    expect(clamp(-1, 3)).toBe(0);
    expect(clamp(5, 3)).toBe(3);
    expect(clamp(2, 3)).toBe(2);
  });
});
`;

describe('testCoverageRule', () => {
  it('discards, measures, homologates, retries the agent with feedback until coverage passes and reviews test quality', async () => {
    const workspace = createVitestWorkspace({
      'app/package.json': '{ "name": "app", "type": "module" }',
      'app/vitest.config.ts':
        "import { defineConfig } from 'vitest/config';\nexport default defineConfig({ test: { include: ['src/**/*.{test,spec}.{ts,tsx}'] } });\n",
      'app/src/constants.ts': 'export const MIN = 0;\n',
      'app/src/math.ts': [
        "import { MIN } from './constants';",
        'export const add = (left: number, right: number) => left + right;',
        'export function clamp(value: number, max: number) {',
        '  if (value < MIN) return MIN;',
        '  if (value > max) return max;',
        '  return value;',
        '}',
        '',
      ].join('\n'),
      'app/src/math.entries.json': '{ "math": "src/math.ts" }\n',
      'app/src/types.ts': 'export type Point = { x: number; y: number };\n',
      'app/src/covered.ts': 'export const double = (value: number) => value * 2;\n',
      'app/src/covered.test.ts':
        "import { expect, it } from 'vitest';\nimport { double } from './covered';\nit('doubles', () => { expect(double(2)).toBe(4); expect(double(0)).toBe(0); });\n",
    });

    const editPrompts: string[] = [];
    const provider = createFakeProvider({
      analyzeResponders: defaultFakeAnalyzeResponders,
      editResponder: ({ prompt }) => {
        editPrompts.push(prompt);
        const isSecondCoverageAttempt = prompt.includes('Attempt 1 → failed');
        if (isSecondCoverageAttempt) fs.writeFileSync(workspace.at('app/src/math/math.test.ts'), MATH_TEST);
      },
    });

    const context: ReviewContext = {
      workspaceRoot: workspace.root,
      invocationDirectory: workspace.root,
      options: { acceptDefaults: true, goal: 90, maxCoverageAttempts: 3, maxQualityAttempts: 1 },
      ask: scriptedAsk(),
      logger: silentLogger(),
      run: createRunArtifacts({ workspaceRoot: workspace.root }),
    };

    const report = await testCoverageRule.run({
      context,
      provider,
      files: ['app/src/math.ts', 'app/src/types.ts', 'app/src/covered.ts'].map(workspace.at),
      logger: context.logger,
    });

    const resultByFile = Object.fromEntries(report.fileResults.map((result) => [result.file, result]));
    expect(Object.keys(resultByFile).sort()).toEqual([
      'app/src/covered.ts',
      'app/src/math/math.ts',
      'app/src/types.ts',
    ]);
    expect(resultByFile['app/src/types.ts']).toMatchObject({
      status: 'notTestable',
      outcome: 'skipped',
      reason: 'types-only module',
    });
    expect(resultByFile['app/src/covered.ts']).toMatchObject({
      status: 'alreadyCovered',
      outcome: 'passed',
      details: { initial: '100.0%' },
    });
    expect(resultByFile['app/src/math/math.ts']).toMatchObject({
      status: 'improved',
      outcome: 'passed',
      details: { initial: '0.0%', final: '100.0%', goal: '90%', tries: 2, quality: 'min 8/10' },
    });

    const coverageHistory = resultByFile['app/src/math/math.ts'].history!.coverage;
    expect(coverageHistory.map(({ passed }) => passed)).toEqual([false, true]);
    expect(coverageHistory[0].feedback).toBe('lines 0% → goal 90% ✗ · uncovered lines 1-7');
    expect(editPrompts[0]).toContain('No previous attempts.');
    expect(editPrompts[1]).toContain('Attempt 1 → failed\n  feedback: lines 0% → goal 90%');

    expect(workspace.read('app/src/math/math.ts')).toContain("import { MIN } from '../constants';");
    expect(workspace.read('app/src/math/index.ts')).toBe("export * from './math';\n");
    expect(workspace.read('app/src/math.entries.json')).toBe('{ "math": "src/math/math.ts" }\n');
    expect(report.changedOutsideTargets).toEqual(['app/src/math.entries.json', 'app/src/math/index.ts']);
    expect(report.notes).toEqual([
      'app/src/math.ts: homologated into app/src/math/ (1 reference(s) updated)',
    ]);
  });
});
