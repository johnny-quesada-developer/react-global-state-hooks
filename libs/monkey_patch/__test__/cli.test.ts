import { describe, expect, it } from 'vitest';
import { HELP, parseArgs, UsageError } from '../src/cli/args';
import { formatEvent, formatStoreList } from '../src/cli/format';
import { resolveTargets } from '../src/cli/resolve';
import { renderSelector } from '../src/cli/select';
import type { AgentStoreInfo } from '../src/agent/protocol';

const store = (overrides: Partial<AgentStoreInfo>): AgentStoreInfo => ({
  selector: 'n:todos',
  name: 'todos',
  location: 'src/stores/todos.ts:8',
  isContext: false,
  persistedKey: null,
  instances: 1,
  preview: '{\n  "todos": []\n}',
  actions: ['add', 'remove'],
  ...overrides,
});

const stores = [
  store({}),
  store({ selector: 'n:auth', name: 'auth', location: 'src/stores/auth.ts:5', actions: ['login'] }),
  store({ selector: 'p:cart', name: null, location: 'src/components/ShoppingCart.tsx:23', preview: '{\n  "items": []\n}' }),
];

describe('parseArgs', () => {
  it('splits comma separated stores and accepts repeated flags', () => {
    expect(parseArgs(['--store', 'todos,auth', '-s', 'counter']).targets).toEqual(['todos', 'auth', 'counter']);
    expect(parseArgs(['--store=todos']).targets).toEqual(['todos']);
  });

  it('accepts * as a value', () => {
    expect(parseArgs(['--store', '*']).targets).toEqual(['*']);
  });

  it('rejects unknown flags, missing values and bad ports', () => {
    expect(() => parseArgs(['--nope'])).toThrow(UsageError);
    expect(() => parseArgs(['--store'])).toThrow('needs a value');
    expect(() => parseArgs(['--port', 'abc'])).toThrow('--port');
  });
});

describe('parseArgs commands', () => {
  it('parses an action with JSON arguments, and plain words as text', () => {
    expect(parseArgs(['action', 'todos', 'add', 'Write docs', '5', 'true', '{"a":1}', '["x"]']).command).toEqual({
      kind: 'action',
      store: 'todos',
      action: 'add',
      args: ['Write docs', 5, true, { a: 1 }, ['x']],
    });
  });

  it('parses set with a JSON value, including negative numbers', () => {
    expect(parseArgs(['set', 'counter', '-3']).command).toEqual({ kind: 'set', store: 'counter', state: -3 });
    expect(parseArgs(['set', 'todos', '{"todos":[]}']).command).toMatchObject({ state: { todos: [] } });
  });

  it('does not turn a broken object into a string', () => {
    expect(() => parseArgs(['set', 'todos', '{todos: []}'])).toThrow('Not valid JSON');
    expect(() => parseArgs(['action', 'todos', 'add', '{"a":'])).toThrow('Not valid JSON');
  });

  it('rejects missing parts, unknown commands, and --store next to a command', () => {
    expect(() => parseArgs(['action', 'todos'])).toThrow('Usage: rgsh action');
    expect(() => parseArgs(['set', 'todos'])).toThrow('Usage: rgsh set');
    expect(() => parseArgs(['nope'])).toThrow('Unknown command');
    expect(() => parseArgs(['--store', 'a', 'set', 'b', '1'])).toThrow('--store does not combine');
  });

  it('parses patch and state', () => {
    expect(parseArgs(['patch', 'todos', '{"a":{"b":1}}']).command).toEqual({
      kind: 'patch',
      store: 'todos',
      patch: { a: { b: 1 } },
    });
    expect(parseArgs(['state', 'todos']).command).toEqual({ kind: 'state', store: 'todos', path: '' });
    expect(parseArgs(['state', 'todos', 'todos[0].done']).command).toMatchObject({ path: 'todos[0].done' });
    expect(() => parseArgs(['patch', 'todos'])).toThrow('Usage: rgsh patch');
    expect(() => parseArgs(['state'])).toThrow('Usage: rgsh state');
  });

  it('reads --timeout', () => {
    expect(parseArgs(['--timeout', '3']).timeoutSeconds).toBe(3);
    expect(() => parseArgs(['--timeout', '0'])).toThrow('--timeout');
  });
});

describe('help', () => {
  it('documents every command, option and exit code so it works as discovery', () => {
    for (const part of [
      '--list', '--store', '--port', '--timeout', 'rgsh state', 'rgsh action', 'rgsh patch', 'rgsh set',
      'Allow the terminal to change state and run actions', 'EXIT CODES', 'READING THE OUTPUT', 'setMetadata',
      '__non_serializable__',
    ]) {
      expect(HELP).toContain(part);
    }
  });
});

describe('resolveTargets', () => {
  it('maps names to selectors', () => {
    expect(resolveTargets(['todos', 'auth'], stores)).toEqual({ selectors: ['n:todos', 'n:auth'], unknown: [] });
  });

  it('finds an unnamed store by its creation location', () => {
    expect(resolveTargets(['ShoppingCart.tsx:23'], stores).selectors).toEqual(['p:cart']);
  });

  it('reports unknown targets with close candidates and selects nothing for them', () => {
    const result = resolveTargets(['todo', 'zzz'], stores);

    expect(result.selectors).toEqual([]);
    expect(result.unknown[0]).toEqual({ target: 'todo', candidates: ['todos'] });
    expect(result.unknown[1].candidates).toEqual(['todos', 'auth', 'unnamed src/components/ShoppingCart.tsx:23']);
  });
});

describe('formatEvent', () => {
  const todo = { id: 3, text: 'Write the docs', done: false };

  it('prints store, action input, state changes and duration, and no result for a void action', () => {
    const text = formatEvent({
      kind: 'action',
      at: new Date(2026, 8, 21, 12, 3, 41, 221).getTime(),
      store: { label: 'todos' },
      action: 'add',
      input: ['Write the docs'],
      steps: [[{ path: 'todos[2]', after: todo }]],
      stateCalls: 1,
      result: {},
      durationMs: 1,
    });

    expect(text).toBe(
      [
        '12:03:41.221 [todos] add("Write the docs")',
        '  state:',
        '    todos[2]: undefined → {"id":3,"text":"Write the docs","done":false}',
        '  duration: 1ms',
      ].join('\n'),
    );
  });

  it('shows every state step separately and errors instead of results', () => {
    const text = formatEvent({
      kind: 'action',
      at: 0,
      store: { label: 'auth', instance: 2 },
      action: 'login',
      input: ['ada@x.dev'],
      steps: [[{ path: 'loading', before: false, after: true }], [{ path: 'loading', before: true, after: false }]],
      stateCalls: 2,
      result: { error: 'Error: 401' },
      durationMs: 812,
    });

    expect(text).toContain('[auth #2] login("ada@x.dev")');
    expect(text).toContain('state (1/2):');
    expect(text).toContain('state (2/2):');
    expect(text).toContain('  error: Error: 401');
    expect(text).not.toContain('result:');
  });

  it('says when the state was set without changing', () => {
    const text = formatEvent({ kind: 'action', at: 0, store: { label: 'counter' }, action: 'setState', steps: [], stateCalls: 1 });

    expect(text).toContain('[counter] setState');
    expect(text).toContain('state: no change');
  });

  it('pretty prints values that do not fit on a line', () => {
    const text = formatEvent({
      kind: 'action',
      at: 0,
      store: { label: 'todos' },
      action: 'setState',
      steps: [[{ path: '', before: { a: 'x'.repeat(120) }, after: { a: 'y'.repeat(120) } }]],
      stateCalls: 1,
    });

    expect(text).toContain('(state): {\n      "a"');
  });

  it('prints store lifecycle without internal message names', () => {
    expect(formatEvent({ kind: 'store-created', at: 0, store: { label: 'todos' } })).toMatch(/\[todos\] store created$/);
  });
});

describe('store list and picker', () => {
  it('lets an unnamed store be recognised by location, state and actions', () => {
    const list = formatStoreList(stores);

    expect(list).toContain('unnamed — src/components/ShoppingCart.tsx:23');
    expect(list).toContain('state: { "items": [] }');
    expect(list).toContain('actions: add, remove');
  });

  it('shows the highlighted store preview under the list', () => {
    const lines = renderSelector(stores, { cursor: 2, marked: new Set([0]) });
    const text = lines.join('\n');

    expect(text).toContain('❯   unnamed — src/components/ShoppingCart.tsx:23');
    expect(text).toContain('  ◉ todos');
    expect(text).toContain('All stores');
    expect(text).toContain('State:\n{\n  "items": []\n}');
    expect(text).toContain('Actions:\nadd\nremove');
  });

  it('never renders more lines than the terminal has, and scrolls the list to the cursor', () => {
    const many = Array.from({ length: 30 }, (_, index) =>
      store({ selector: `n:s${index}`, name: `s${index}`, preview: JSON.stringify({ index }, null, 2), actions: ['a', 'b', 'c', 'd', 'e'] }),
    );

    for (const cursor of [0, 15, 29, 30]) {
      const lines = renderSelector(many, { cursor, marked: new Set() }, 20);

      expect(lines.length).toBeLessThanOrEqual(19);
      expect(lines.filter((line) => line.startsWith('❯'))).toHaveLength(1);
    }
  });
});
