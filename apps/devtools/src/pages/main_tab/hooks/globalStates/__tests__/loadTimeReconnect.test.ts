import { EntityAdapter } from '@src/shared/tools/EntityAdapter';
import { AdaptiveEntityAdapter } from '@src/shared/tools/AdaptiveEntityAdapter';
import {
  generateGlobalStateId,
  type GlobalStateId,
  type GlobalStateJson,
} from '@src/shared/schema/GlobalStateJson';
import { generateActionId } from '@src/shared/schema/ActionJson';
import { generateActionLogId } from '@src/shared/schema/ActionLogJson';
import { ActionTypeJsonEnum } from '@src/shared/schema/ActionTypeJson';
import { SubActionJsonEnum } from '@src/shared/schema/SubActionJson';
import globalStates$, {
  actionsById$,
  actionIdsByStateId$,
  actionKeysByStateId$,
  stateMetaDevTools$,
  type ContentScriptMessage,
} from '../globalStates';
import { loadMockState, loadReconciledSnapshot } from '../helpers/loadMockState';
import { getGlobalStateIdsOfPath } from '../helpers/globalStatesIdsByPath';

const actions = globalStates$.actions!;
const wrap = <T>(payload: T): ContentScriptMessage<T> => ({ action: 'test', payload, timestamp: 0, id: 'm' });
const addLiveState = (json: GlobalStateJson) => actions.ADD_GLOBAL_STATE(wrap(json));

const CTX_PATH = 'Error\n    at new GlobalStore (http://localhost:5199/@fs/src/ctx.ts:1:1)';
const COUNTER_PATH = 'Error\n    at new GlobalStore (http://localhost:5199/@fs/src/counter.ts:1:1)';

const liveJson = (path: string, name: string, initialState: unknown = 0): GlobalStateJson => ({
  globalStateId: generateGlobalStateId(),
  name,
  metadata: {},
  localStorage: null,
  actions: null,
  callbacks: null,
  initialState,
  globalStatePath: path,
  isContext: false,
});

/** A snapshot entity with one custom action + one setState log, all under `loadedId`. */
const snapEntity = (loadedId: string, path: string, name: string, currentState: unknown) => {
  const actionId = generateActionId();
  return {
    globalStateId: loadedId,
    name,
    metadata: {},
    localStorage: null,
    actions: null,
    callbacks: null,
    initialState: 0,
    currentState,
    globalStatePath: path,
    isContext: false,
    groupedByActionStateLogs: {
      ids: [actionId],
      entities: {
        [actionId]: {
          globalStateId: loadedId,
          actionId,
          action: 'increment',
          async: false,
          start: 0,
          timing: 0,
          actionType: ActionTypeJsonEnum.CUSTOM_ACTION,
          logs: [
            {
              logId: generateActionLogId(),
              globalStateId: loadedId,
              actionId,
              payload: currentState,
              case: 'resolved',
              scope: 'lifecycle',
              timestamp: 0,
              subAction: SubActionJsonEnum.setState,
            },
          ],
        },
      },
    },
  };
};

beforeEach(() => {
  globalStates$.setState(new EntityAdapter({}));
  actionsById$.setState(new AdaptiveEntityAdapter({}));
  actionIdsByStateId$.setState(new EntityAdapter({}));
  actionKeysByStateId$.setState(new EntityAdapter({}));
  stateMetaDevTools$.setState(new Map());
  loadMockState({ entities: {}, ids: [] });
});

describe('load-time reconnection (reconcile against the live mirror the panel already holds)', () => {
  it('adopts the live id at load when a live store exists at the same path', () => {
    // Live mirror already has a counter at COUNTER_PATH.
    const live = liveJson(COUNTER_PATH, 'counter');
    addLiveState(live);

    // Load a snapshot describing the same store under a different (exported) id.
    const loadedId = 'store-id:loaded-counter';
    loadReconciledSnapshot({
      ids: [loadedId],
      entities: { [loadedId]: snapEntity(loadedId, COUNTER_PATH, 'counter', 42) },
    });

    const root = globalStates$.getState();

    // The loaded id is gone; the entry lives under the LIVE id, connected (no flag), snapshot state kept.
    expect(root.has(loadedId as GlobalStateId)).toBe(false);
    expect(root.has(live.globalStateId)).toBe(true);
    expect(root.get(live.globalStateId)?.currentState).toBe(42);
    expect(root.get(live.globalStateId)?.isLoadedSnapshot).toBeUndefined();

    // Its action + log were re-keyed to the live id.
    const actionIds = actionIdsByStateId$.getState().get(live.globalStateId);
    expect(actionIds?.size).toBe(1);
    const [actionId] = [...(actionIds ?? [])];
    const action = actionsById$.getState().get(actionId);
    expect(action?.globalStateId).toBe(live.globalStateId);
    expect(action?.logs.every((l) => l.globalStateId === live.globalStateId)).toBe(true);

    // Path index points at the live id.
    expect(getGlobalStateIdsOfPath(COUNTER_PATH)).toEqual([live.globalStateId]);
  });

  it('pairs multi-instance paths index-aligned (a[i] = b[i])', () => {
    // Two live form-context instances at the same path.
    const liveA = liveJson(CTX_PATH, 'form-context');
    const liveB = liveJson(CTX_PATH, 'form-context');
    addLiveState(liveA);
    addLiveState(liveB);

    // Snapshot has two instances at that path too, plus their own loaded ids.
    const l0 = 'store-id:loaded-ctx-0';
    const l1 = 'store-id:loaded-ctx-1';
    loadReconciledSnapshot({
      ids: [l0, l1],
      entities: {
        [l0]: snapEntity(l0, CTX_PATH, 'form-context', 'A'),
        [l1]: snapEntity(l1, CTX_PATH, 'form-context', 'B'),
      },
    });

    const root = globalStates$.getState();
    // Instance 0 -> liveA, instance 1 -> liveB, both connected, state preserved.
    expect(root.get(liveA.globalStateId)?.currentState).toBe('A');
    expect(root.get(liveB.globalStateId)?.currentState).toBe('B');
    expect(root.get(liveA.globalStateId)?.isLoadedSnapshot).toBeUndefined();
    expect(root.get(liveB.globalStateId)?.isLoadedSnapshot).toBeUndefined();
    expect(getGlobalStateIdsOfPath(CTX_PATH)).toEqual([liveA.globalStateId, liveB.globalStateId]);
  });

  it('discards surplus loaded instances when there are fewer live instances', () => {
    // Only one live instance at the path.
    const liveA = liveJson(CTX_PATH, 'form-context');
    addLiveState(liveA);

    const l0 = 'store-id:loaded-ctx-0';
    const l1 = 'store-id:loaded-ctx-1';
    loadReconciledSnapshot({
      ids: [l0, l1],
      entities: {
        [l0]: snapEntity(l0, CTX_PATH, 'form-context', 'A'),
        [l1]: snapEntity(l1, CTX_PATH, 'form-context', 'B'),
      },
    });

    const root = globalStates$.getState();
    // Instance 0 connected to the live id; instance 1 has no live store to pair with => discarded.
    expect(root.get(liveA.globalStateId)?.currentState).toBe('A');
    expect(root.has(l1 as GlobalStateId)).toBe(false);
    // The path index only tracks the connected live id.
    expect(getGlobalStateIdsOfPath(CTX_PATH)).toEqual([liveA.globalStateId]);
    // Total stores loaded = 1 (the surplus was dropped, not stored).
    expect(root.ids.length).toBe(1);
  });

  it('discards a store entirely when no live store exists at its path', () => {
    const loadedId = 'store-id:orphan';
    loadReconciledSnapshot({
      ids: [loadedId],
      entities: { [loadedId]: snapEntity(loadedId, COUNTER_PATH, 'counter', 5) },
    });

    const root = globalStates$.getState();
    expect(root.has(loadedId as GlobalStateId)).toBe(false);
    expect(root.ids.length).toBe(0);
  });

  it('reports a store as not-restorable when its whole state is non-serializable', () => {
    const live = liveJson(COUNTER_PATH, 'counter');
    addLiveState(live);

    const loadedId = 'store-id:fn-state';
    const entity = snapEntity(loadedId, COUNTER_PATH, 'counter', 0);
    // Whole saved state is a non-serializable placeholder (e.g. the store held a function).
    entity.currentState = { __non_serializable__: 'function' };

    const { reconnected, notRestorable } = loadReconciledSnapshot({
      ids: [loadedId],
      entities: { [loadedId]: entity },
    });

    // It still connects (adopts the live id) and stays in the panel view, but nothing is pushed.
    expect(globalStates$.getState().has(live.globalStateId)).toBe(true);
    expect(reconnected).toEqual([]);
    expect(notRestorable).toEqual(['counter']);
  });

  it('connects across different Vite optimizer hashes (?v=) on the same creation site', () => {
    // Same site, but the live path and the snapshot path carry different ?v= tokens (different
    // page loads). Normalization must let them still pair.
    const liveWithHashA =
      'Error\n    at useState (http://localhost:5199/node_modules/.vite/deps/chunk-X.js?v=aaaaaaaa:10:5)';
    const snapshotWithHashB =
      'Error\n    at useState (http://localhost:5199/node_modules/.vite/deps/chunk-X.js?v=bbbbbbbb:10:5)';

    const live = liveJson(liveWithHashA, 'form-context');
    addLiveState(live);

    const loadedId = 'store-id:ctx-diff-hash';
    loadReconciledSnapshot({
      ids: [loadedId],
      entities: { [loadedId]: snapEntity(loadedId, snapshotWithHashB, 'form-context', 'kept') },
    });

    const root = globalStates$.getState();
    // Paired despite the different ?v= token; snapshot state kept under the live id.
    expect(root.has(loadedId as GlobalStateId)).toBe(false);
    expect(root.get(live.globalStateId)?.currentState).toBe('kept');
  });

  it('connects ALL instances when the page has the same count at a shared path (contexts created at load)', () => {
    // Four form-context providers, all created at the same call site => identical path, mounted on
    // every page load. The snapshot captured four; the reloaded page has four again.
    const live = [
      liveJson(CTX_PATH, 'form-context'),
      liveJson(CTX_PATH, 'form-context'),
      liveJson(CTX_PATH, 'form-context'),
      liveJson(CTX_PATH, 'form-context'),
    ];
    live.forEach(addLiveState);

    const loadedIds = ['store-id:c0', 'store-id:c1', 'store-id:c2', 'store-id:c3'];
    const states = ['A', 'B', 'C', 'D'];
    loadReconciledSnapshot({
      ids: loadedIds,
      entities: Object.fromEntries(
        loadedIds.map((id, i) => [id, snapEntity(id, CTX_PATH, 'form-context', states[i])]),
      ),
    });

    const root = globalStates$.getState();
    // Every loaded instance paired with a live one, in order; none skipped.
    live.forEach((liveStore, i) => {
      expect(root.get(liveStore.globalStateId)?.currentState).toBe(states[i]);
    });
    expect(root.ids.length).toBe(4);
    expect(getGlobalStateIdsOfPath(CTX_PATH)).toEqual(live.map((l) => l.globalStateId));
    // No loaded id survives (all adopted live ids).
    loadedIds.forEach((id) => expect(root.has(id as GlobalStateId)).toBe(false));
  });
});
