import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createFakeProvider,
  defaultFakeAnalyzeResponders,
  type FakeEditCall,
} from '../../providers/fakeProvider';
import type { ReviewContext } from '../../pipeline/ReviewContext';
import { scriptedAsk } from '../../shared/ask';
import { silentLogger } from '../../shared/logger';
import { defaultProjectConfig } from '../../shared/projectConfig';
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

const FAILING_TEST = `import { expect, it } from 'vitest';
import { hard } from './hard';

it('is wrong on purpose', () => {
  expect(hard(2)).toBe(-2);
});
`;

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
      'app/src/hard.ts': 'export const hard = (value: number) => (value > 1 ? value : -value);\n',
    });

    const editPrompts: string[] = [];
    const editCalls: FakeEditCall[] = [];
    const fileBySession = new Map<string, string>();
    let metadataCalls = 0;
    const provider = createFakeProvider({
      analyzeResponders: {
        ...defaultFakeAnalyzeResponders,
        'capture-test-metadata': (params) => {
          metadataCalls += 1;
          return defaultFakeAnalyzeResponders['capture-test-metadata'](params);
        },
      },
      editCalls,
      editResponder: ({ prompt, session }) => {
        editPrompts.push(prompt);
        if (prompt.includes('app/src/math/math.ts')) fileBySession.set(session!.id, 'math');
        if (prompt.includes('app/src/hard/hard.ts')) fileBySession.set(session!.id, 'hard');
        const target = fileBySession.get(session!.id);
        const isRetry = prompt.startsWith('Attempt ');
        if (target === 'math' && isRetry)
          fs.writeFileSync(workspace.at('app/src/math/math.test.ts'), MATH_TEST);
        if (target === 'hard') fs.writeFileSync(workspace.at('app/src/hard/hard.test.ts'), FAILING_TEST);
      },
    });

    const context: ReviewContext = {
      workspaceRoot: workspace.root,
      invocationDirectory: workspace.root,
      options: {
        targets: [],
        acceptDefaults: true,
        verbose: false,
        goal: 90,
        maxCoverageAttempts: 3,
        maxQualityAttempts: 1,
      },
      projectConfig: defaultProjectConfig(),
      ask: scriptedAsk(),
      logger: silentLogger(),
      run: createRunArtifacts({ workspaceRoot: workspace.root }),
    };

    const report = await testCoverageRule.run({
      context,
      provider,
      files: ['app/src/math.ts', 'app/src/types.ts', 'app/src/covered.ts', 'app/src/hard.ts'].map(
        workspace.at,
      ),
      logger: context.logger,
    });

    const resultByFile = Object.fromEntries(report.fileResults.map((result) => [result.file, result]));
    expect(Object.keys(resultByFile).sort()).toEqual([
      'app/src/covered.ts',
      'app/src/hard/hard.ts',
      'app/src/math/math.ts',
      'app/src/types.ts',
    ]);
    expect(resultByFile['app/src/hard/hard.ts']).toMatchObject({
      status: 'coverageFailed',
      outcome: 'failed',
    });
    expect(resultByFile['app/src/hard/hard.ts'].reason).toMatch(
      /stopped early after 2 attempt\(s\) because .*(did not change any file|same failure repeated)/,
    );
    expect(workspace.read('app/src/hard/hard.test.ts')).toMatch(
      /^\/\/ \[TODO\] code-review\(test-coverage\): coverage goal stopped early/,
    );
    expect(editPrompts.find((prompt) => prompt.includes('app/src/hard/hard.ts'))).toContain(
      'npx vitest related src/hard/hard.ts --run',
    );
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
      details: { initial: '0.0%', final: '100.0%', goal: '90%', tries: 2, quality: 'min 8/10', cost: '—' },
    });

    const coverageHistory = resultByFile['app/src/math/math.ts'].history!.coverage;
    expect(coverageHistory.map(({ passed }) => passed)).toEqual([false, true]);
    expect(coverageHistory[0].feedback).toBe('lines 0% → goal 90% ✗ · uncovered lines 1-7');
    const mathCalls = editCalls.filter(({ sessionId }) => fileBySession.get(sessionId!) === 'math');
    expect(mathCalls.map(({ wasResumed }) => wasResumed)).toEqual([false, true]);
    expect(new Set(mathCalls.map(({ sessionId }) => sessionId)).size).toBe(1);
    expect(mathCalls[0].systemPrompt).toContain('Write the complete test file in ONE Write call');
    expect(mathCalls[0].prompt).toContain('export function clamp(value: number, max: number)');
    expect(mathCalls[0].prompt).toContain('npx vitest related src/math/math.ts --run');
    expect(mathCalls[1].prompt).toMatch(/^Attempt 1 measured by the pipeline: lines 0% /);
    expect(mathCalls[1].prompt).not.toContain('export function clamp');

    expect(workspace.read('app/src/math/math.ts')).toContain("import { MIN } from '../constants';");
    expect(workspace.read('app/src/math/index.ts')).toBe("export * from './math';\n");
    expect(workspace.read('app/src/math.entries.json')).toBe('{ "math": "src/math/math.ts" }\n');
    expect(report.changedOutsideTargets).toEqual([
      'app/src/hard/index.ts',
      'app/src/math.entries.json',
      'app/src/math/index.ts',
    ]);
    expect(report.notes).toEqual([
      'app/src/math.ts: homologated into app/src/math/ (1 reference(s) updated)',
      'app/src/hard.ts: homologated into app/src/hard/ (0 reference(s) updated)',
    ]);

    const secondRun = await testCoverageRule.run({
      context,
      provider,
      files: [workspace.at('app/src/covered.ts')],
      logger: context.logger,
    });
    expect(secondRun.fileResults[0]).toMatchObject({ status: 'alreadyCovered' });
    expect(metadataCalls).toBe(1);
  });
});
