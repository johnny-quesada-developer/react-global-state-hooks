import { describe, expect, it } from 'vitest';
import { diffState, toAgentValue } from '../stateDiff';

describe('diffState', () => {
  it('returns nothing for equal states', () => {
    expect(diffState({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toEqual([]);
  });

  it('reports primitive changes by path', () => {
    expect(diffState({ token: 'old', user: { name: 'ada' } }, { token: 'new', user: { name: 'ada' } })).toEqual([
      { path: 'token', before: 'old', after: 'new' },
    ]);
  });

  it('reports added and removed keys with one side only', () => {
    expect(diffState({ a: 1, b: 2 }, { a: 1, c: 3 })).toEqual([
      { path: 'b', before: 2 },
      { path: 'c', after: 3 },
    ]);
  });

  it('reports an appended array item at its index', () => {
    const todo = { id: 3, text: 'Write the docs', done: false };

    expect(diffState({ todos: [{ id: 1 }, { id: 2 }] }, { todos: [{ id: 1 }, { id: 2 }, todo] })).toEqual([
      { path: 'todos[2]', after: todo },
    ]);
  });

  it('reports a removed middle item once instead of shifting every following index', () => {
    const changes = diffState({ todos: [{ id: 1 }, { id: 2 }, { id: 3 }] }, { todos: [{ id: 1 }, { id: 3 }] });

    expect(changes).toEqual([{ path: 'todos[1]', before: { id: 2 } }]);
  });

  it('reports an edit inside an array item at the deepest path', () => {
    expect(
      diffState({ todos: [{ id: 1, done: false }] }, { todos: [{ id: 1, done: true }] }),
    ).toEqual([{ path: 'todos[0].done', before: false, after: true }]);
  });

  it('quotes keys that are not identifiers', () => {
    expect(diffState({ 'a-b': 1 }, { 'a-b': 2 })).toEqual([{ path: '["a-b"]', before: 1, after: 2 }]);
  });

  it('treats equal dates as unchanged and different dates as a change', () => {
    expect(diffState({ at: new Date(5) }, { at: new Date(5) })).toEqual([]);
    expect(diffState({ at: new Date(0) }, { at: new Date(1) })).toHaveLength(1);
  });

  it('handles a root primitive and an undefined previous state', () => {
    expect(diffState(1, 2)).toEqual([{ path: '', before: 1, after: 2 }]);
    expect(diffState(undefined, { a: 1 })).toEqual([{ path: '', after: { a: 1 } }]);
  });

  it('caps the number of reported changes and says so', () => {
    const before = Object.fromEntries(Array.from({ length: 50 }, (_, index) => [`k${index}`, 0]));
    const after = Object.fromEntries(Array.from({ length: 50 }, (_, index) => [`k${index}`, 1]));

    const changes = diffState(before, after);

    expect(changes).toHaveLength(31);
    expect(changes[30]).toEqual({ path: '(+20 more changes)' });
  });

  it('falls back to a bounded root change when the state is too large to walk', () => {
    const big = (value: number) => ({ rows: Array.from({ length: 60_000 }, (_, index) => ({ index, value })) });

    const changes = diffState(big(0), big(1));

    expect(changes).toHaveLength(1);
    expect(changes[0].path).toBe('(state too large to diff)');
  });
});

describe('toAgentValue', () => {
  it('marks truncation explicitly', () => {
    const value = toAgentValue({ text: 'x'.repeat(300), list: Array.from({ length: 30 }, (_, index) => index) });

    expect((value as { text: string }).text).toMatch(/…\(\+100 chars\)$/);
    expect((value as { list: unknown[] }).list.at(-1)).toBe('…(+10 items)');
  });

  it('renders Dates, Maps, Sets and Errors JSON-safely', () => {
    expect(toAgentValue(new Date(0))).toBe('1970-01-01T00:00:00.000Z');
    expect(toAgentValue(new Map([['a', 1]]))).toEqual({ $map: [['a', 1]] });
    expect(toAgentValue(new Set([1]))).toEqual({ $set: [1] });
    expect(toAgentValue(new Error('boom'))).toBe('Error: boom');
  });

  it('summarises values nested deeper than the limit', () => {
    expect(toAgentValue({ a: { b: { c: { d: { e: 1 } } } } })).toEqual({ a: { b: { c: { d: '{…1 keys}' } } } });
  });
});
