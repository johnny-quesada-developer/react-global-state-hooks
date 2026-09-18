import { describe, it, expect, beforeEach } from 'vitest';
import { EntityAdapter } from '@src/shared/tools/EntityAdapter';
import { AdaptiveEntityAdapter } from '@src/shared/tools/AdaptiveEntityAdapter';
import {
  generateGlobalStateId,
  type GlobalStateId,
  type GlobalStateJson,
} from '@src/shared/schema/GlobalStateJson';
import { generateActionId, type ActionJson } from '@src/shared/schema/ActionJson';
import { generateActionLogId, type ActionLogJson } from '@src/shared/schema/ActionLogJson';
import { ActionTypeJsonEnum } from '@src/shared/schema/ActionTypeJson';
import { SubActionJsonEnum } from '@src/shared/schema/SubActionJson';
import globalStates$, {
  actionsById$,
  actionIdsByStateId$,
  actionKeysByStateId$,
  stateMetaDevTools$,
  type ContentScriptMessage,
} from '../globalStates';

// The reducers are higher-order: actions[ACTION](message) returns a thunk run by the store.
// Invoking globalStates$.actions[ACTION](message) executes the whole thing.
const actions = globalStates$.actions!;

const wrap = <T>(payload: T): ContentScriptMessage<T> => ({
  action: 'test',
  payload,
  timestamp: Date.now(),
  id: 'msg',
});

const makeGlobalStateJson = (overrides: Partial<GlobalStateJson> = {}): GlobalStateJson => ({
  globalStateId: generateGlobalStateId(),
  name: 'counter',
  metadata: {},
  localStorage: null,
  actions: null,
  callbacks: null,
  initialState: 0,
  globalStatePath: '/src/stores/counter.ts',
  isContext: false,
  ...overrides,
});

const makeAction = (globalStateId: GlobalStateId, overrides: Partial<ActionJson> = {}): ActionJson => {
  const actionId = generateActionId();
  return {
    globalStateId,
    actionId,
    action: 'increment',
    async: false,
    start: Date.now(),
    timing: 0,
    actionType: ActionTypeJsonEnum.CUSTOM_ACTION,
    logs: [],
    ...overrides,
  };
};

const makeSetStateLog = (
  globalStateId: GlobalStateId,
  actionId: string,
  payload: unknown,
): ActionLogJson => ({
  logId: generateActionLogId(),
  globalStateId,
  actionId,
  payload,
  case: 'resolved',
  scope: 'lifecycle',
  timestamp: Date.now(),
  subAction: SubActionJsonEnum.setState,
});

const addState = (json: GlobalStateJson) => actions.ADD_GLOBAL_STATE(wrap(json));
const startAction = (action: ActionJson) => actions.START_ACTION(wrap(action));
const addActionLog = (log: ActionLogJson) => actions.ADD_ACTION_LOG(wrap(log));
const clear = (globalStatePath: string) => actions.CLEAR_GLOBAL_STATES(wrap({ globalStatePath }));
const deleteState = (globalStateId: GlobalStateId) => actions.DELETE_GLOBAL_STATE(wrap({ globalStateId }));

const getMeta = (id: GlobalStateId) => globalStates$.getState().get(id);
const getDevMeta = (id: GlobalStateId) => stateMetaDevTools$.getState().get(id);
const getActionCount = (id: GlobalStateId) => actionIdsByStateId$.getState().get(id)?.size ?? 0;

beforeEach(() => {
  // Reset all module-singleton stores between tests.
  globalStates$.setState(new EntityAdapter({}));
  actionsById$.setState(new AdaptiveEntityAdapter({}));
  actionIdsByStateId$.setState(new EntityAdapter({}));
  actionKeysByStateId$.setState(new EntityAdapter({}));
  stateMetaDevTools$.setState(new Map());
  // Clear any '*'-persisted path index.
  clear('*');
});

describe('globalStates reducers', () => {
  describe('ADD_GLOBAL_STATE', () => {
    it('registers the store with its initial state as currentState', () => {
      const json = makeGlobalStateJson({ initialState: 42 });
      addState(json);

      const meta = getMeta(json.globalStateId);
      expect(meta).toBeDefined();
      expect(meta?.name).toBe('counter');
      expect(meta?.currentState).toBe(42);
    });

    it('creates one initialize action for the store', () => {
      const json = makeGlobalStateJson();
      addState(json);

      expect(getActionCount(json.globalStateId)).toBe(1);
    });

    it('baselines the state as pristine so the initialize action is not unseen', () => {
      const json = makeGlobalStateJson();
      addState(json);

      const dev = getDevMeta(json.globalStateId);
      expect(dev?.isPristine).toBe(true);
      // pristine => unseenLength tracks the action count (1), i.e. the baseline.
      expect(dev?.unseenLength).toBe(1);
    });
  });

  describe('START_ACTION', () => {
    it('commits a setState action to currentState and grows the action count', () => {
      const json = makeGlobalStateJson({ initialState: 0 });
      addState(json);

      const actionId = generateActionId();
      startAction(
        makeAction(json.globalStateId, {
          actionId,
          logs: [makeSetStateLog(json.globalStateId, actionId, 5)],
        }),
      );

      expect(getMeta(json.globalStateId)?.currentState).toBe(5);
      expect(getActionCount(json.globalStateId)).toBe(2); // initialize + this one
    });
  });

  describe('ADD_ACTION_LOG', () => {
    it('appends a log to an existing action and updates currentState (does NOT add a new action)', () => {
      const json = makeGlobalStateJson({ initialState: 0 });
      addState(json);

      const actionId = generateActionId();
      startAction(
        makeAction(json.globalStateId, {
          actionId,
          logs: [makeSetStateLog(json.globalStateId, actionId, 1)],
        }),
      );
      const countAfterStart = getActionCount(json.globalStateId);

      addActionLog(makeSetStateLog(json.globalStateId, actionId, 2));

      expect(getMeta(json.globalStateId)?.currentState).toBe(2);
      // Appending a log to an existing action is not a new action.
      expect(getActionCount(json.globalStateId)).toBe(countAfterStart);
    });
  });

  describe('unseen tracking (stateMetaDevTools$)', () => {
    it('increments unseenLength by 1 per action once the state is tainted', () => {
      const json = makeGlobalStateJson();
      addState(json);

      // View it -> tainted, unseen resets to 0.
      stateMetaDevTools$.actions!.markAsTainted(json.globalStateId);
      expect(getDevMeta(json.globalStateId)?.isPristine).toBe(false);
      expect(getDevMeta(json.globalStateId)?.unseenLength).toBe(0);

      // Two new actions arrive -> unseen grows by 1 each.
      startAction(makeAction(json.globalStateId, { logs: [] }));
      startAction(makeAction(json.globalStateId, { logs: [] }));

      expect(getDevMeta(json.globalStateId)?.unseenLength).toBe(2);
    });

    it('markAsTainted resets unseenLength to 0', () => {
      const json = makeGlobalStateJson();
      addState(json);
      stateMetaDevTools$.actions!.markAsTainted(json.globalStateId);
      startAction(makeAction(json.globalStateId, { logs: [] }));
      expect(getDevMeta(json.globalStateId)?.unseenLength).toBe(1);

      stateMetaDevTools$.actions!.markAsTainted(json.globalStateId);
      expect(getDevMeta(json.globalStateId)?.unseenLength).toBe(0);
    });
  });

  describe('DELETE_GLOBAL_STATE', () => {
    it('removes the state and its derived data', () => {
      const json = makeGlobalStateJson();
      addState(json);
      expect(getMeta(json.globalStateId)).toBeDefined();

      deleteState(json.globalStateId);

      expect(getMeta(json.globalStateId)).toBeUndefined();
      expect(getActionCount(json.globalStateId)).toBe(0);
      expect(getDevMeta(json.globalStateId)).toBeUndefined();
    });

    it('deleting one instance leaves other instances of the same path registered', () => {
      const path = '/src/context/Provider.tsx';
      const a = makeGlobalStateJson({ globalStatePath: path, name: 'ctx' });
      const b = makeGlobalStateJson({ globalStatePath: path, name: 'ctx' });
      addState(a);
      addState(b);

      deleteState(a.globalStateId);

      expect(getMeta(a.globalStateId)).toBeUndefined();
      expect(getMeta(b.globalStateId)).toBeDefined();
    });
  });

  describe("CLEAR_GLOBAL_STATES('*')", () => {
    it('removes every state and all derived data', () => {
      const a = makeGlobalStateJson({ name: 'a', globalStatePath: '/a.ts' });
      const b = makeGlobalStateJson({ name: 'b', globalStatePath: '/b.ts' });
      addState(a);
      addState(b);

      clear('*');

      expect(globalStates$.getState().ids.length).toBe(0);
      expect(getDevMeta(a.globalStateId)).toBeUndefined();
      expect(getDevMeta(b.globalStateId)).toBeUndefined();
    });
  });

  describe('non-fiber path replacement (ADD wipes, RE_ADD does not)', () => {
    const reAddState = (json: GlobalStateJson) => actions.RE_ADD_GLOBAL_STATE(wrap(json));

    it('ADD_GLOBAL_STATE with isFiber:false replaces the previous non-fiber store at that path', () => {
      const path = '/src/stores/hmr.ts';
      const first = makeGlobalStateJson({ globalStatePath: path, isFiber: false, name: 'first' });
      addState(first);
      expect(getMeta(first.globalStateId)).toBeDefined();

      const second = makeGlobalStateJson({ globalStatePath: path, isFiber: false, name: 'second' });
      addState(second);

      // Old one wiped, new one present.
      expect(getMeta(first.globalStateId)).toBeUndefined();
      expect(getMeta(second.globalStateId)).toBeDefined();
      expect(getActionCount(first.globalStateId)).toBe(0);
    });

    it('ADD_GLOBAL_STATE with isFiber:true keeps multiple instances at the same path', () => {
      const path = '/src/context/Provider.tsx';
      const a = makeGlobalStateJson({ globalStatePath: path, isFiber: true, name: 'ctx' });
      const b = makeGlobalStateJson({ globalStatePath: path, isFiber: true, name: 'ctx' });
      addState(a);
      addState(b);

      expect(getMeta(a.globalStateId)).toBeDefined();
      expect(getMeta(b.globalStateId)).toBeDefined();
    });

    it('ADD_GLOBAL_STATE with isFiber undefined does not wipe (back-compat)', () => {
      const path = '/src/stores/legacy.ts';
      const a = makeGlobalStateJson({ globalStatePath: path, name: 'a' });
      const b = makeGlobalStateJson({ globalStatePath: path, name: 'b' });
      addState(a);
      addState(b);

      expect(getMeta(a.globalStateId)).toBeDefined();
      expect(getMeta(b.globalStateId)).toBeDefined();
    });

    it('RE_ADD_GLOBAL_STATE adds a store without wiping others at the same path', () => {
      const path = '/src/stores/dynamic.ts';
      const live = makeGlobalStateJson({ globalStatePath: path, isFiber: false, name: 'live' });
      addState(live);

      // A superseded-but-alive store re-announces itself; must NOT remove `live`.
      const revived = makeGlobalStateJson({ globalStatePath: path, isFiber: false, name: 'revived' });
      reAddState(revived);

      expect(getMeta(live.globalStateId)).toBeDefined();
      expect(getMeta(revived.globalStateId)).toBeDefined();
    });
  });
});
