import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { createFakeProvider } from '../providers/fakeProvider';
import { scoreInBatches } from '../segments/rules/scoring';
import { silentLogger } from '../shared/logger';
import { createResultCache } from '../shared/resultCache';
import { summarizeExports } from '../shared/sourceSummary';
import { createConcurrentLoop, pickWave } from './createConcurrentLoop';

const temporaryDirectories: string[] = [];

afterEach(() => {
  temporaryDirectories
    .splice(0)
    .forEach((directory) => fs.rmSync(directory, { recursive: true, force: true }));
});

const temporaryDirectory = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'review-opt-'));
  temporaryDirectories.push(directory);
  return directory;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('createConcurrentLoop', () => {
  it('runs compatible items in waves, keeps incompatible ones apart and returns outputs in input order', async () => {
    const items = [
      { id: 'a', folder: 'x' },
      { id: 'b', folder: 'x' },
      { id: 'c', folder: 'y' },
      { id: 'd', folder: 'z' },
    ];
    const canRunTogether = (left: (typeof items)[number], right: (typeof items)[number]) =>
      left.folder !== right.folder;

    const { wave, remaining } = pickWave({
      pending: items.map((item, index) => ({ item, index })),
      concurrency: 3,
      canRunTogether,
    });
    expect(wave.map(({ item }) => item.id)).toEqual(['a', 'c', 'd']);
    expect(remaining.map(({ item }) => item.id)).toEqual(['b']);

    let running = 0;
    let maxRunning = 0;
    const loop = createConcurrentLoop<(typeof items)[number], string>({
      name: 'waves',
      concurrency: 3,
      canRunTogether,
      processItem: async ({ id }, { index, total }) => {
        running += 1;
        maxRunning = Math.max(maxRunning, running);
        await wait(id === 'a' ? 30 : 5);
        running -= 1;
        return `${index}/${total}:${id}`;
      },
    });

    expect(await loop.run(items)).toEqual(['0/4:a', '1/4:b', '2/4:c', '3/4:d']);
    expect(maxRunning).toBe(3);

    const sequential = createConcurrentLoop<number, number>({
      name: 'one',
      concurrency: 1,
      processItem: async (n) => n * 2,
    });
    expect(await sequential.run([1, 2, 3])).toEqual([2, 4, 6]);
    expect(await sequential.run([])).toEqual([]);
  });
});

describe('result cache and source summary', () => {
  it('remembers passes per file content and forgets them when the content or the goal changes', () => {
    const root = temporaryDirectory();
    const file = path.join(root, 'a.ts');
    fs.writeFileSync(file, 'export const a = 1;\n');
    const cache = createResultCache({ reviewDirectory: path.join(root, '.review'), ruleId: 'demo' });

    const key = cache.keyFor({ files: [file], extra: 'goal:80' });
    expect(cache.readPass(key)).toBeUndefined();
    cache.rememberPass(key, { lines: 92 });
    expect(cache.readPass<{ lines: number }>(key)).toEqual({ lines: 92 });
    expect(cache.keyFor({ files: [file], extra: 'goal:80' })).toBe(key);
    expect(cache.keyFor({ files: [file], extra: 'goal:90' })).not.toBe(key);

    fs.writeFileSync(file, 'export const a = 2;\n');
    expect(cache.readPass(cache.keyFor({ files: [file], extra: 'goal:80' }))).toBeUndefined();
  });

  it('summarizes a source by its exported signatures so scorers do not need the whole file', () => {
    const root = temporaryDirectory();
    const file = path.join(root, 'store.ts');
    fs.writeFileSync(
      file,
      [
        "import { z } from 'zod';",
        'const internal = 42;',
        'export const createStore = (initial: number) => {',
        '  return { value: initial + internal };',
        '};',
        'export function reset(store: { value: number }): void {',
        '  store.value = 0;',
        '}',
        'export type Store = ReturnType<typeof createStore>;',
        'export default createStore;',
      ].join('\n'),
    );
    expect(summarizeExports(file).split('\n')).toEqual([
      'export const createStore = (initial: number)',
      'export function reset(store: { value: number }): void',
      'export type Store = ReturnType<typeof createStore>;',
      'export default createStore;',
    ]);
  });
});

describe('scoreInBatches', () => {
  const itemSchema = z.object({ scores: z.object({ clarity: z.number() }), flags: z.array(z.string()) });

  it('scores several files in one call and falls back to one call per file when the batch answer is unusable', async () => {
    const calls: string[] = [];
    const provider = createFakeProvider({
      analyzeResponders: {
        'score-demo': ({ prompt, file }) => {
          calls.push(file ?? 'single');
          const isBroken = prompt.includes('BREAK THE BATCH') && file !== undefined;
          return isBroken ? { nonsense: true } : { scores: { clarity: 9 }, flags: [] };
        },
      },
    });

    const reviews = await scoreInBatches({
      provider,
      task: 'score-demo',
      systemPrompt: 'Keys of "scores" must be exactly: clarity.',
      items: [
        { file: 'a.ts', section: 'content a' },
        { file: 'b.ts', section: 'content b' },
        { file: 'c.ts', section: 'content c' },
      ],
      itemSchema,
      batchSize: 2,
      cwd: process.cwd(),
      logger: silentLogger(),
    });

    expect([...reviews.keys()].sort()).toEqual(['a.ts', 'b.ts', 'c.ts']);
    expect(reviews.get('b.ts')).toEqual({ scores: { clarity: 9 }, flags: [] });
    expect(calls).toEqual(['a.ts', 'b.ts', 'single']);

    calls.length = 0;
    const fallback = await scoreInBatches({
      provider,
      task: 'score-demo',
      systemPrompt: 'Keys of "scores" must be exactly: clarity.',
      items: [
        { file: 'a.ts', section: 'BREAK THE BATCH a' },
        { file: 'b.ts', section: 'BREAK THE BATCH b' },
      ],
      itemSchema,
      batchSize: 4,
      cwd: process.cwd(),
      logger: silentLogger(),
    });
    expect([...fallback.keys()].sort()).toEqual(['a.ts', 'b.ts']);
    expect(calls.filter((call) => call === 'single')).toHaveLength(2);
  });
});
