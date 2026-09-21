import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGlobalState, isRecord, shallowCompare, uniqueId } from 'react-global-state-hooks';

describe('callbacks', () => {
  beforeEach(() => vi.resetModules());

  it('onInit, onStateChanged and computePreventStateChange behave as documented', async () => {
    const { log, useGuarded } = await import('./reference/callbacks');
    expect(log).toEqual(['init:0']);

    useGuarded.setState({ count: 1 });
    expect(log).toEqual(['init:0', 'changed:0->1']);
    expect(useGuarded.metadata.changes).toBe(1);

    // rejected before it is applied
    useGuarded.setState({ count: -1 });
    expect(useGuarded.getState().count).toBe(1);
    expect(log).toEqual(['init:0', 'changed:0->1']);

    // reset() runs the cleanup, then onInit again
    useGuarded.reset({ count: 5 }, { changes: 0 });
    expect(log.slice(2)).toEqual(['cleanup', 'init:5']);
  });

  it('onSubscribed runs for each new subscription', () => {
    const calls: number[] = [];
    const store = createGlobalState(0, { callbacks: { onSubscribed: () => calls.push(1) } });

    store.subscribe(() => {});
    store.subscribe(
      (state) => state,
      () => {},
    );

    expect(calls).toHaveLength(2);
  });
});

describe('utilities', () => {
  it('shallowCompare compares arrays and objects by their items', () => {
    expect(shallowCompare([1, 2], [1, 2])).toBe(true);
    expect(shallowCompare({ a: 1 }, { a: 1 })).toBe(true);
    expect(shallowCompare([1, 2], [1, 3])).toBe(false);
    expect(shallowCompare({ a: { b: 1 } }, { a: { b: 1 } })).toBe(false);
  });

  it('isRecord tells plain objects from other values', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(isRecord('x')).toBe(false);
  });

  it('uniqueId generates prefixed ids and branded generators validate them', () => {
    expect(uniqueId('user:')).toMatch(/^user:/);
    expect(uniqueId()).not.toBe(uniqueId());

    const userId = uniqueId.for('user:');
    const id = userId();
    expect(id.startsWith('user:')).toBe(true);
    expect(userId.is(id)).toBe(true);
    expect(userId.is(uniqueId.for('post:')())).toBe(false);
    expect(() => userId.assert(uniqueId.for('post:')())).toThrow();
  });
});
