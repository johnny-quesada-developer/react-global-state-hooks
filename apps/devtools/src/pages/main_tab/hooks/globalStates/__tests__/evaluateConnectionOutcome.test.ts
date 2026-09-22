import { describe, it, expect } from 'vitest';
import { evaluateSnapshotAgainstLive, type SnapshotStoreRef } from '../helpers/evaluateConnectionOutcome';

describe('evaluateSnapshotAgainstLive', () => {
  it('returns null when the snapshot is empty', () => {
    expect(evaluateSnapshotAgainstLive([], new Map())).toBeNull();
  });

  it('returns null when every snapshot instance pairs with a live instance', () => {
    const snapshot: SnapshotStoreRef[] = [
      { name: 'counter', globalStatePath: '/a' },
      { name: 'todos', globalStatePath: '/b' },
    ];
    const live = new Map([
      ['/a', 1],
      ['/b', 2],
      ['/c', 1],
    ]);

    expect(evaluateSnapshotAgainstLive(snapshot, live)).toBeNull();
  });

  it("reports 'no-live-page' when nothing matches and there are no live stores", () => {
    const snapshot: SnapshotStoreRef[] = [
      { name: 'counter', globalStatePath: '/a' },
      { name: 'todos', globalStatePath: '/b' },
    ];

    expect(evaluateSnapshotAgainstLive(snapshot, new Map())).toEqual({
      kind: 'no-live-page',
      connected: [],
      unconnected: ['counter', 'todos'],
      notRestorable: [],
    });
  });

  it("reports 'partial' when some paths match and some do not", () => {
    const snapshot: SnapshotStoreRef[] = [
      { name: 'counter', globalStatePath: '/a' },
      { name: 'todos', globalStatePath: '/b' },
    ];
    const live = new Map([['/a', 1]]);

    expect(evaluateSnapshotAgainstLive(snapshot, live)).toEqual({
      kind: 'partial',
      connected: ['counter'],
      unconnected: ['todos'],
      notRestorable: [],
    });
  });

  it('pairs multi-instance paths index-aligned: surplus loaded instances are unconnected', () => {
    // 4 form-context instances in the snapshot, only 2 live => first 2 connect, last 2 do not.
    const snapshot: SnapshotStoreRef[] = [
      { name: 'form#1', globalStatePath: '/ctx' },
      { name: 'form#2', globalStatePath: '/ctx' },
      { name: 'form#3', globalStatePath: '/ctx' },
      { name: 'form#4', globalStatePath: '/ctx' },
    ];
    const live = new Map([['/ctx', 2]]);

    expect(evaluateSnapshotAgainstLive(snapshot, live)).toEqual({
      kind: 'partial',
      connected: ['form#1', 'form#2'],
      unconnected: ['form#3', 'form#4'],
      notRestorable: [],
    });
  });

  it('returns null when live instances meet or exceed the snapshot count at a path', () => {
    const snapshot: SnapshotStoreRef[] = [
      { name: 'form#1', globalStatePath: '/ctx' },
      { name: 'form#2', globalStatePath: '/ctx' },
    ];
    const live = new Map([['/ctx', 3]]);

    expect(evaluateSnapshotAgainstLive(snapshot, live)).toBeNull();
  });

  it("reports 'partial' (not no-live-page) when nothing matches but other live stores exist", () => {
    const snapshot: SnapshotStoreRef[] = [{ name: 'counter', globalStatePath: '/a' }];
    const live = new Map([['/other', 1]]);

    const result = evaluateSnapshotAgainstLive(snapshot, live);
    expect(result?.kind).toBe('partial');
    expect(result?.unconnected).toEqual(['counter']);
  });
});
