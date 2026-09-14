import { createGlobalState, InferStateApi } from 'react-global-state-hooks/createGlobalState';
import { type GlobalStateMetaExtended } from './helpers/useGlobalStates.types';
import { assertIsNonNullable } from '@src/shared/asserts';
import {
  type ActionLogJson,
  generateActionLogId,
  type GlobalStateId,
  type GlobalStateJson,
  generateActionId,
  type ActionId,
  type ActionJson,
  type ActionUpdate,
  assertActionUpdate,
  ActionTypeJsonEnum,
  SubActionJsonEnum,
} from '@src/shared/schema';
import { EntityAdapter } from '@src/shared/tools/EntityAdapter';
import { AdaptiveEntityAdapter } from '@src/shared/tools/AdaptiveEntityAdapter';
import { default as isSetStateSubAction } from '@src/shared/tools/isSetStateSubAction';
import { addGlobalStateToPath, removeGlobalStatePath, removeGlobalStatesOfPath } from './helpers/globalStatesIdsByPath';
import type { ClearGlobalStatesMessagePayload } from '@src/shared/schema/MonkeyPathMessageJson/ClearGlobalStatesMessage';

export type ContentScriptMessage<T> = {
  action: string;
  payload: T;
  timestamp: number;
  id: string;
};

/**
 * Source of truth for all captured actions (from every store), keyed by actionId.
 * Holds the action metadata and its logs. Other action stores only reference ids
 * into this one.
 */
export const actionsById$ = createGlobalState(new AdaptiveEntityAdapter<ActionId, ActionJson>({}), {
  name: 'actionsById',
});

/**
 * Index of which actions belong to which store: globalStateId -> Set of actionIds.
 * Lets us fetch a single store's actions directly (no scanning of other stores) and
 * lets consumers react only to their selected store's actions.
 */
export const actionIdsByStateId$ = createGlobalState(new EntityAdapter<GlobalStateId, Set<ActionId>>({}), {
  name: 'actionIdsByStateId',
});

/**
 * Per-store grouping of action calls by action key: globalStateId -> Map(actionKey
 * -> ordered actionIds). Lets a single store's action-key groups be fetched directly
 * (no scanning of other stores) and shows how many times each named action ran.
 */
export const actionKeysByStateId$ = createGlobalState(new EntityAdapter<GlobalStateId, Map<string, ActionId[]>>({}), {
  name: 'actionKeysByStateId',
});

export type GlobalStatesContextApi = InferStateApi<typeof globalStates$>;

const removeStateIdsFromDerivedStores = (stateIds: GlobalStateId[]) => {
  if (!stateIds.length) return;

  const actionsById = new AdaptiveEntityAdapter(actionsById$.getState());
  const actionIdsByStateId = new EntityAdapter(actionIdsByStateId$.getState());
  const actionKeysByStateId = new EntityAdapter(actionKeysByStateId$.getState());

  for (const stateId of stateIds) {
    const actionIds = actionIdsByStateId.get(stateId);
    if (actionIds) {
      for (const actionId of actionIds) actionsById.delete(actionId);
    }

    actionIdsByStateId.delete(stateId);
    actionKeysByStateId.delete(stateId);
  }

  actionsById$.setState(actionsById);
  actionIdsByStateId$.setState(actionIdsByStateId);
  actionKeysByStateId$.setState(actionKeysByStateId);
};

/**
 * Registry of every inspected store, keyed by globalStateId. Holds each store's
 * metadata and current state, and owns the action-message reducers (ADD_GLOBAL_STATE,
 * START_ACTION, ADD_ACTION_LOG, ...) that populate the action stores above.
 */
const globalStates$ = createGlobalState(new EntityAdapter<GlobalStateId, GlobalStateMetaExtended>({}), {
  name: 'globalStates',
  metadata: {
    logMessages: true,
  },
  actions: {
    SET_REACT_BUILD_TYPE: (
      { payload }: ContentScriptMessage<{ buildType: 'production' | 'development' }>,
      _sender: chrome.runtime.MessageSender
    ) => {
      return () => {
        assertIsNonNullable(payload?.buildType, 'payload.buildType should be defined');

        // export let buildType: 'production' | 'development' = 'production';
        // buildType = payload.buildType;
        console.log('todo build type:', payload.buildType);
      };
    },

    ADD_GLOBAL_STATE: (
      { payload: globalStateJson }: ContentScriptMessage<GlobalStateJson>,
      _sender: chrome.runtime.MessageSender
    ) => {
      return ({ setState, getState }) => {
        assertIsNonNullable(globalStateJson, 'stateMeta should be defined');

        const actionId = generateActionId();
        const actionKey = 'initialize';

        const firstLog: ActionLogJson = {
          logId: generateActionLogId(),
          globalStateId: globalStateJson.globalStateId,
          actionId,
          payload: globalStateJson.initialState,
          case: 'resolved',
          scope: 'lifecycle',
          timestamp: Date.now(),
          subAction: SubActionJsonEnum.setState,
        };

        const initialAction: ActionJson = {
          globalStateId: globalStateJson.globalStateId,
          actionId,
          action: actionKey,
          async: false,
          start: Date.now(),
          timing: 0,
          logs: [firstLog],
          actionType: ActionTypeJsonEnum.LIFE_CYCLE,
        };

        const globalStoreMeta: GlobalStateMetaExtended = {
          ...globalStateJson,
          currentState: globalStateJson.initialState,
        };

        const rootState = new EntityAdapter(getState());
        rootState.add(globalStateJson.globalStateId, globalStoreMeta);

        // Update derived stores BEFORE globalStates$ so that when globalStates$ triggers
        // selectedGlobalStateId$ → useLogsArray subscriber, the action data is already available.
        syncActionToStores(initialAction);
        setState(rootState);
        addGlobalStateToPath(globalStateJson.globalStatePath, globalStateJson.globalStateId);
      };
    },

    CLEAR_GLOBAL_STATES: (
      message: ContentScriptMessage<ClearGlobalStatesMessagePayload>,
      _sender: chrome.runtime.MessageSender
    ) => {
      return ({ setState, getState }) => {
        const previousState = new EntityAdapter(getState());
        const previousIds = [...previousState.ids];

        // delete the states associated with and specific path
        // this is compatible with fast refresh and page reload
        // if the path is not found, returns the current state otherwise copy
        const currentState = removeGlobalStatesOfPath(
          message.payload.globalStatePath,
          new EntityAdapter(previousState)
        );
        const removedStateIds = previousIds.filter((stateId) => !currentState.has(stateId));
        if (!removedStateIds.length) return;

        setState(currentState);
        removeStateIdsFromDerivedStores(removedStateIds);
      };
    },

    START_ACTION: ({ payload: action }: ContentScriptMessage<ActionJson>, _sender: chrome.runtime.MessageSender) => {
      return ({ setState, getState }) => {
        assertIsNonNullable(action, 'action should be defined');

        const rootState = new EntityAdapter(getState());
        const stateMeta = rootState.get(action.globalStateId);

        assertIsNonNullable(stateMeta, 'stateMeta should be defined');

        const firstLog = action.logs[0];

        // simple actions are committed immediately
        if (isSetStateSubAction(firstLog) && !Object.is(stateMeta.currentState, firstLog.payload)) {
          stateMeta.currentState = firstLog.payload;

          rootState.set(action.globalStateId, {
            ...stateMeta,
          });

          setState(rootState);
        }

        syncActionToStores(action);
      };
    },

    UPDATE_ACTION: ({ payload }: ContentScriptMessage<ActionUpdate>, _sender: chrome.runtime.MessageSender) => {
      return () => {
        assertActionUpdate(payload);

        const actionsById = new AdaptiveEntityAdapter(actionsById$.getState());
        const actionMeta = actionsById.get(payload.actionId);
        assertIsNonNullable(actionMeta, 'actionMeta should be defined');

        actionsById.set(payload.actionId, {
          ...actionMeta,
          ...payload,
          logs: actionMeta.logs,
        });

        actionsById$.setState(actionsById);
      };
    },

    ADD_ACTION_LOG: (
      { payload: actionLog }: ContentScriptMessage<ActionLogJson>,
      _sender: chrome.runtime.MessageSender
    ) => {
      return ({ setState, getState }) => {
        assertIsNonNullable(actionLog, 'payload should be defined');

        const rootState = new EntityAdapter(getState());
        const stateMeta = rootState.get(actionLog.globalStateId);

        assertIsNonNullable(stateMeta, 'stateMeta should be defined');

        const actionsById = new AdaptiveEntityAdapter(actionsById$.getState());
        const actionMeta = actionsById.get(actionLog.actionId);

        assertIsNonNullable(actionMeta, 'actionMeta should be defined');

        actionsById.set(actionLog.actionId, {
          ...actionMeta,
          logs: [...actionMeta.logs, actionLog],
        });

        actionsById$.setState(actionsById);

        // Order matters: set actionsById$ first, then bump actionIdsByStateId$ last.
        // Consumers (logsArray$, useActionsHeaders) react to actionIdsByStateId$ and
        // read the updated action from actionsById$ during that reaction. The bump
        // (new Set, same ids) is what propagates an appended log to those consumers.
        const actionIdsByStateId = new EntityAdapter(actionIdsByStateId$.getState());
        const currentIds = actionIdsByStateId.get(actionLog.globalStateId);
        actionIdsByStateId.set(actionLog.globalStateId, new Set(currentIds));
        actionIdsByStateId$.setState(actionIdsByStateId);

        if (isSetStateSubAction(actionLog)) {
          stateMeta.currentState = actionLog.payload;
          rootState.set(actionLog.globalStateId, {
            ...stateMeta,
          });
          setState(rootState);
        }
      };
    },

    DELETE_GLOBAL_STATE: (
      {
        payload,
      }: ContentScriptMessage<{
        globalStateId: GlobalStateId;
      }>,
      _sender: chrome.runtime.MessageSender
    ) => {
      return ({ setState, getState }) => {
        assertIsNonNullable(payload, 'payload should be defined');

        const rootState = new EntityAdapter(getState());
        const stateMeta = rootState.get(payload.globalStateId);

        assertIsNonNullable(stateMeta, 'stateMeta should be defined');

        rootState.delete(payload.globalStateId);

        setState(rootState);
        removeStateIdsFromDerivedStores([payload.globalStateId]);
        removeGlobalStatePath(stateMeta.globalStatePath);
      };
    },
  },
});

export function isGlobalStateAction(action: string): action is keyof GlobalStatesContextApi['actions'] {
  return Boolean(globalStates$.actions![action as keyof GlobalStatesContextApi['actions']]);
}

export default globalStates$;

export function syncActionToStores(action: ActionJson) {
  const actionsById = new AdaptiveEntityAdapter(actionsById$.getState());
  const actionIdsByStateId = new EntityAdapter(actionIdsByStateId$.getState());
  const actionKeysByStateId = new EntityAdapter(actionKeysByStateId$.getState());

  actionsById.add(action.actionId, action);

  const previousActionIds = actionIdsByStateId.get(action.globalStateId);
  actionIdsByStateId.set(action.globalStateId, new Set(previousActionIds).add(action.actionId));

  const keysByActionKey = new Map(actionKeysByStateId.get(action.globalStateId));
  keysByActionKey.set(action.action, [...(keysByActionKey.get(action.action) ?? []), action.actionId]);
  actionKeysByStateId.set(action.globalStateId, keysByActionKey);

  // Order matters: actionIdsByStateId$ must be set last. logsArray$ and
  // useActionsHeaders react to it and read actionsById$ during that reaction,
  // so actionsById$ has to already hold the new action or it gets dropped.
  actionsById$.setState(actionsById);
  actionKeysByStateId$.setState(actionKeysByStateId);
  actionIdsByStateId$.setState(actionIdsByStateId);
}
