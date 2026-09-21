import { describe, expect, it } from 'vitest';
import { mergePatch, parsePath, readPath } from '../stateOps';

describe('mergePatch', () => {
  it('replaces primitives and null', () => {
    expect(mergePatch(1, 2)).toBe(2);
    expect(mergePatch({ a: 1 }, null)).toBeNull();
    expect(mergePatch('x', 5)).toBe(5);
  });

  it('merges objects recursively and keeps the keys the patch does not mention', () => {
    const state = { user: { name: 'ada', tags: ['a'] }, count: 1, other: true };

    expect(mergePatch(state, { user: { name: 'grace' }, count: 2 })).toEqual({
      user: { name: 'grace', tags: ['a'] },
      count: 2,
      other: true,
    });
  });

  it('replaces arrays instead of merging them', () => {
    expect(mergePatch({ todos: [1, 2, 3] }, { todos: [9] })).toEqual({ todos: [9] });
  });

  it('replaces when the kinds differ, and does not mutate the state', () => {
    const state = { a: { b: 1 } };

    expect(mergePatch(state, { a: 5 })).toEqual({ a: 5 });
    expect(mergePatch(5, { a: 1 })).toEqual({ a: 1 });
    expect(state).toEqual({ a: { b: 1 } });
  });

  it('keeps non-serializable placeholders so the page keeps its real value', () => {
    const state = { count: 1, handler: { __non_serializable__: 'function' } };

    expect(mergePatch(state, { count: 2 })).toEqual({ count: 2, handler: { __non_serializable__: 'function' } });
  });
});

describe('readPath', () => {
  const state = { todos: [{ id: 1, done: false }], user: { 'first-name': 'Ada' }, nothing: null };

  it('reads nested keys and indexes', () => {
    expect(readPath(state, 'todos[0].done')).toEqual({ found: true, value: false });
    expect(readPath(state, 'user["first-name"]')).toEqual({ found: true, value: 'Ada' });
    expect(readPath(state, '')).toEqual({ found: true, value: state });
  });

  it('tells a null value from a missing one', () => {
    expect(readPath(state, 'nothing')).toEqual({ found: true, value: null });
    expect(readPath(state, 'missing')).toEqual({ found: false });
    expect(readPath(state, 'todos[3]')).toEqual({ found: false });
    expect(readPath(state, 'todos.done')).toEqual({ found: false });
  });

  it('rejects a malformed path', () => {
    expect(parsePath('todos[')).toBeNull();
    expect(readPath(state, 'todos..done')).toEqual({ found: false });
  });
});
