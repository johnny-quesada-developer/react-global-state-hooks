import type { GlobalStoreParameter } from './tools/react';
import { ActionTypeJsonEnum } from './schema/ActionTypeJson';
import { Logger } from './monkey_patch.logger';
import { getGlobalStateMetaPayload } from './monkey_patch.utils';
import sendMessageFromMonkeyPath from './sendMessageFromMonkeyPath';

import { SubActionJsonEnum } from './schema/SubActionJson';
import { softClone } from './tools/softClone';
import { EntityAdapter } from './tools/EntityAdapter';
import {
  onReactDevToolsConnect,
  getGlobalThis,
  getReactBuildType,
  getCurrentFiber,
  addFiberUnmountSubscription,
  type Fiber,
} from './tools/react';
import { mergeState } from './mergeState';
import formatFromStore from 'json-storage-formatter/formatFromStore';
import isFunction from 'json-storage-formatter/isFunction';
import { SetStateConfigJson } from './schema/SetStateConfigJson';
import { generateActionId } from './schema/ActionJson';
import uniqueId from 'react-global-state-hooks/uniqueId';
import { isPromise } from 'easy-cancelable-promise/isPromise';
import { tryCatch } from 'easy-cancelable-promise/tryCatch';
import type { AnyFunction } from 'react-global-state-hooks';

const global = getGlobalThis(globalThis);

// The devtools panel does not reload with the page. On every page load the patch re-executes, so
// we clear everything the panel held for the previous load and start fresh. '*' means "clear all".
// Guarded so a load-time environment without a usable messaging channel (SSR, tests importing
// helpers) cannot throw during module eval.
tryCatch(() =>
  sendMessageFromMonkeyPath({
    id: uniqueId('cleanup:'),
    action: 'CLEAR_GLOBAL_STATES',
    payload: {
      globalStatePath: '*',
    },
  }),
);

type RegisteredStore = { store: GlobalStoreParameter; args: unknown; storePath: string };

const globalStatesById = new EntityAdapter<string, RegisteredStore>();

/**
 * Fiber-based lifecycle cleanup.
 *
 * When a store is created during a React render (context providers, or a store created inside a
 * component via useState/useMemo), we associate its storeId with the currently-rendering fiber.
 * When React unmounts that fiber, we delete those stores. Stores created at module scope have no
 * current fiber and are left alone (they live for the page's lifetime).
 *
 * React double-buffers a component's fiber (current <-> alternate), and the object passed to
 * onCommitFiberUnmount may be either half of that pair, so we key BOTH the fiber and its alternate
 * and union-lookup on unmount.
 */
const storeIdsByFiber = new WeakMap<Fiber, Set<string>>();

const addStoreIdToFiber = (fiber: Fiber, storeId: string) => {
  const ids = storeIdsByFiber.get(fiber) ?? new Set<string>();
  ids.add(storeId);
  storeIdsByFiber.set(fiber, ids);
};

/** Associate a store with the fiber that created it (if any). No-op at module scope. */
const registerStoreForFiber = (storeId: string) => {
  const fiber = getCurrentFiber();
  if (!fiber) return;

  addStoreIdToFiber(fiber, storeId);
  if (fiber.alternate) addStoreIdToFiber(fiber.alternate, storeId);
};

addFiberUnmountSubscription((fiber) => {
  const ids = new Set<string>([
    ...(storeIdsByFiber.get(fiber) ?? []),
    ...(fiber.alternate ? (storeIdsByFiber.get(fiber.alternate) ?? []) : []),
  ]);

  if (!ids.size) return;

  for (const storeId of ids) sendDeleteGlobalStateMessage(storeId);

  storeIdsByFiber.delete(fiber);
  if (fiber.alternate) storeIdsByFiber.delete(fiber.alternate);
});

/**
 * Re-emits the minimal set of messages needed to recreate every live store at its
 * current state: the build type, then one ADD_GLOBAL_STATE per store (rebuilt from
 * the live instance so initialState reflects the store's current value). Used when a
 * devtools panel opens after the page has already been running, so it syncs without
 * a page reload. Intermediate action history is intentionally not replayed.
 */
const replaySnapshot = () => {
  sendMessageFromMonkeyPath({
    id: uniqueId('build-type:'),
    action: 'SET_REACT_BUILD_TYPE',
    payload: {
      buildType: getReactBuildType(),
    },
  });

  for (const { store, args, storePath } of globalStatesById.values()) {
    sendMessageFromMonkeyPath({
      id: uniqueId('path:'),
      action: 'ADD_GLOBAL_STATE',
      payload: getGlobalStateMetaPayload({
        globalState: store,
        globalStateId: store._DEV_TOOLS_STORE_ID,
        globalStatePath: storePath,
        args,
      }),
    });
  }
};

type ActiveActionContext = { onSetState: (setter: unknown, config: SetStateConfigJson) => void };
const activeActionContextByStore = new Map<string, ActiveActionContext[]>();

const getActiveActionContext = (storeId: string): ActiveActionContext | undefined => {
  const stack = activeActionContextByStore.get(storeId);
  return stack?.[stack.length - 1];
};

const runWithActiveActionContext = <T>(storeId: string, context: ActiveActionContext, run: () => T): T => {
  const stack = activeActionContextByStore.get(storeId) ?? [];
  stack.push(context);
  activeActionContextByStore.set(storeId, stack);

  const cleanup = () => {
    const current = activeActionContextByStore.get(storeId);
    current?.pop();
    if (current && current.length === 0) activeActionContextByStore.delete(storeId);
  };

  try {
    const result = run();
    if (isPromise(result)) return (result as Promise<unknown>).finally(cleanup) as T;
    cleanup();
    return result;
  } catch (error) {
    cleanup();
    throw error;
  }
};

onReactDevToolsConnect(() => {
  // send the current build type when devtools connect
  sendMessageFromMonkeyPath({
    id: uniqueId('build-type:'),
    action: `SET_REACT_BUILD_TYPE`,
    payload: {
      buildType: getReactBuildType(),
    },
  });
});

// connector function, extends the instances of GlobalStore to add devtool capabilities
global.REACT_GLOBAL_STATE_HOOK_DEBUG = (store, args, storePath) => {
  const storeId = uniqueId('store-id:');

  // Tie this store to the fiber creating it (if inside a render), so it's cleaned up when that
  // component unmounts. Module-scope stores have no current fiber and are skipped.
  registerStoreForFiber(storeId);

  store._DEV_TOOLS_STORE_ID = storeId;

  store._DEV_TOOLS_IS_CONTEXT = Boolean(
    (args as { __devtools_isContextStore?: boolean } | undefined)?.__devtools_isContextStore,
  );

  // store the global state instance by its id for later usage
  // this reference allow the devtool panel to request interactions with specific global states
  // args/storePath are retained so the store can be re-announced on snapshot replay
  globalStatesById.add(storeId, { store, args, storePath });

  sendMessageFromMonkeyPath({
    id: uniqueId('path:'),
    action: 'ADD_GLOBAL_STATE',
    payload: getGlobalStateMetaPayload({
      globalState: store,
      globalStateId: storeId,
      globalStatePath: storePath,
      args,
    }),
  });

  const { setState, getMainHook, dispose, getStoreActionsMap, createSelectorHook } = store;

  // setState is captured here, before store.setState is overridden below.
  // Passing this original reference into the action wrappers prevents double-logging:
  // direct user setState calls are logged by the override, while setState calls
  // inside actions are logged by the action wrapper using this original.

  /**
   * Adds the store id to the main hook returned object
   */
  store.getMainHook = () => {
    const hook = getMainHook.apply(store);

    Object.assign(hook, {
      _DEV_TOOLS_STORE_ID: storeId,
      _DEV_TOOLS_IS_CONTEXT: store._DEV_TOOLS_IS_CONTEXT,
    });

    return hook;
  };

  /**
   * Adds the store id to the selector hook returned object
   */
  store.createSelectorHook = ((...args: Parameters<typeof createSelectorHook>) => {
    const hook = createSelectorHook.apply(store, args);

    Object.assign(hook, {
      _DEV_TOOLS_STORE_ID: storeId,
      _DEV_TOOLS_IS_CONTEXT: store._DEV_TOOLS_IS_CONTEXT,
    });

    return hook;
  }) as typeof createSelectorHook;

  /**
   * Overrides the setState method to log state mutations
   */
  store.setState = ((setter: unknown, config: SetStateConfigJson = {}) => {
    // If a setState happens while an action is running, hand it to that action's
    // setState wrapper (logged as a sub-action of the action) instead of emitting
    // a separate top-level state-mutation entry.
    const active = getActiveActionContext(storeId);
    if (active) {
      active.onSetState(setter, config);
      return;
    }

    const wrapped = makeSetStateWrapper({ store, setState }, ({ state, config: cfg }) => {
      const logger = new Logger({ storeId, prefix: 'setState:' });

      logger.recordStateMutation({
        actionId: generateActionId(),
        state,
        config: cfg,
      });
    });

    return wrapped(setter, config);
  }) as GlobalStoreParameter['setState'];

  /**
   * Called by the library instead of getStoreActionsMap() during initialize().
   * Lazily obtains actions/storeTools and wraps each action with logging.
   */
  store.__devtools_initialize_getStoreActionsMapWrapped = makeGetStoreActionsMapWrapper({
    logsPrefix: '', // non lifecycle actions do not have a prefix
    store,
    setState,
    getStoreActionsMap: () => getStoreActionsMap.call(store),
  });

  /**
   * Called by the library during lifecycle callbacks (onInit, onStateChanged, etc.)
   * to get storeTools whose actions are wrapped with logging for that lifecycle scope.
   */
  store.__devtools_getLifeCycleStoreToolsWrapper = makeGetLifeCycleStoreToolsWrapper({
    store,
    setState,
    getStoreActionsMap: () => getStoreActionsMap.call(store),
  });

  store.dispose = () => {
    sendDeleteGlobalStateMessage(storeId);
    dispose.call(store);
  };

  return store;
};

export function makeSetStateWrapper(
  args: {
    store: GlobalStoreParameter;
    setState: GlobalStoreParameter['setState'];
  },
  logCallback: (args: { state: unknown; config: SetStateConfigJson }) => void,
) {
  return (setter: unknown | (() => unknown), config: SetStateConfigJson = {}) => {
    const previousState = args.store.state;
    const newState = isFunction(setter) ? setter(previousState) : setter;

    logCallback({ state: newState, config });

    return args.setState.call(args.store, newState, config);
  };
}

/**
 * Wraps the getStoreActionsMap method to add logging capabilities to each action
 */
export function makeGetStoreActionsMapWrapper({
  logsPrefix,
  store,
  setState,
  getStoreActionsMap,
}: {
  logsPrefix: string;
  store: GlobalStoreParameter;
  /**
   * Original setState method, captured before store.setState is overridden.
   * This prevents double-logging: action wrappers call this directly, bypassing
   * the outer store.setState logging wrapper.
   */
  setState: GlobalStoreParameter['setState'];
  getStoreActionsMap: () => {
    actions: GlobalStoreParameter['actions'];
    storeTools: GlobalStoreParameter['storeTools'];
  };
}): GlobalStoreParameter['getStoreActionsMap'] {
  return (() => {
    const { actions, storeTools } = getStoreActionsMap();

    // if there are no actions, there is not need to wrap anything
    if (!actions) return { actions: null, storeTools };

    const keys = Object.keys(actions);
    const isStateChangeScope = logsPrefix.includes('onStateChanged');

    // avoid creating a infinite loop when setState is called from onStateChanged
    const stateSetter = (
      isStateChangeScope ? store.setActualStateWithoutValidations : setState
    ) as React.Dispatch<React.SetStateAction<unknown>>;

    const logger = new Logger({ storeId: store._DEV_TOOLS_STORE_ID, prefix: `${logsPrefix}:action` });

    for (const action_key of keys) {
      const actionHandler = actions[action_key] as (...args: unknown[]) => unknown;

      // override wraps the action to add logging
      Object.assign(actions, {
        [action_key](...parameters: unknown[]): unknown {
          const actionMeta = logger.addEntryForInitialAction({
            action: action_key,
            firstLog: {
              actionId: generateActionId(),
              payload: softClone(parameters),
              case: 'pending',
              subAction: null,
            },
            actionType: ActionTypeJsonEnum.CUSTOM_ACTION,
          });

          const setStateWrapper = makeSetStateWrapper({ store, setState: stateSetter }, ({ state }) => {
            logger.pushActionEntry({
              actionMeta,
              log: {
                actionId: actionMeta.actionId,
                subAction: SubActionJsonEnum.setState,
                payload: softClone(state),
                case: 'pending',
              },
              isFinalEntry: false,
            });
          });

          const storeId = store._DEV_TOOLS_STORE_ID;
          const onSetState = (setter: unknown, config: SetStateConfigJson) => setStateWrapper(setter, config);

          try {
            const handlerResult = runWithActiveActionContext(storeId, { onSetState }, () =>
              actionHandler.apply(actions, parameters),
            );

            if (!isPromise(handlerResult)) {
              logger.pushActionEntry({
                actionMeta,
                log: {
                  actionId: actionMeta.actionId,
                  case: `resolved`,
                  payload: softClone(handlerResult),
                  subAction: null,
                },
                isFinalEntry: true,
              });

              return handlerResult;
            }

            logger.pushActionLogUpdate({
              actionId: actionMeta.actionId,
              async: true,
            });

            return handlerResult
              .then((result: unknown) => {
                logger.pushActionEntry({
                  actionMeta,
                  log: {
                    actionId: actionMeta.actionId,
                    case: `resolved`,
                    payload: softClone(result),
                    subAction: null,
                  },
                  isFinalEntry: true,
                });

                return result;
              })
              .catch((error: Error) => {
                console.error(error);
                console.trace();

                logger.pushActionEntry({
                  actionMeta,
                  log: {
                    actionId: actionMeta.actionId,
                    case: `rejected`,
                    payload: null,
                    error,
                    subAction: null,
                  },
                  isFinalEntry: true,
                });

                throw error;
              });
          } catch (error) {
            logger.pushActionEntry({
              actionMeta,
              log: {
                actionId: actionMeta.actionId,
                case: `rejected`,
                payload: null,
                error,
                subAction: null,
              },
              isFinalEntry: true,
            });

            throw error;
          }
        },
      });
    }

    // Context stores expose `use` on their storeTools (attached by createContext after
    // init). The wrapper builds a fresh storeTools, so forward `use` lazily from the
    // canonical store.storeTools to keep the shape identical to the unpatched library.
    if (store._DEV_TOOLS_IS_CONTEXT) {
      Object.assign(storeTools, {
        use: (...args: unknown[]) => {
          return (store.storeTools as { use?: AnyFunction } | undefined)?.use?.(...args);
        },
      });
    }

    return { actions, storeTools };
  }) as GlobalStoreParameter['getStoreActionsMap'];
}

/**
 * Returns a wrapper to get the store tools for an specific lifecycle method
 */
export function makeGetLifeCycleStoreToolsWrapper({
  store,
  setState,
  getStoreActionsMap,
}: {
  store: GlobalStoreParameter;
  setState: GlobalStoreParameter['setState'];
  getStoreActionsMap: () => {
    actions: GlobalStoreParameter['actions'];
    storeTools: GlobalStoreParameter['storeTools'];
  };
}) {
  return (logsPrefix: string) => {
    return makeGetStoreActionsMapWrapper({
      logsPrefix,
      store,
      setState,
      getStoreActionsMap,
    })().storeTools;
  };
}

export function sendDeleteGlobalStateMessage(globalStateId: string) {
  // Drop it from the registry so it is not re-announced on a later snapshot replay.
  globalStatesById.delete(globalStateId);

  sendMessageFromMonkeyPath({
    id: uniqueId('path:'),
    action: 'DELETE_GLOBAL_STATE',
    payload: {
      globalStateId,
    },
  });
}

export function addDevtoolsListeners() {
  // once the devtools are connected, send the current build type
  onReactDevToolsConnect(() => {
    sendMessageFromMonkeyPath({
      id: uniqueId('build-type:'),
      action: `SET_REACT_BUILD_TYPE`,
      payload: {
        buildType: getReactBuildType(),
      },
    });
  });

  window.addEventListener(
    'message',
    (
      event: MessageEvent<{
        action: string;
        payload: {
          actionName: string;
          globalStateId: string;
          parameters: string;
          state: string;
        };
      }>,
    ) => {
      if (event.source !== window) return;

      const path = event.data?.action;
      if (!path?.includes('devtools-request')) return;

      const [, action] = path.split('/');

      // panel opened: re-announce every live store at its current state
      if (action === 'REQUEST_SNAPSHOT') {
        return replaySnapshot();
      }

      // try to execute an specific action of and specific global state
      if (action === 'EXECUTE_ACTION') {
        const { payload } = event.data;
        const { actionName, globalStateId, parameters: parametersString } = payload;
        const args: unknown[] = Function(`return [${parametersString.trim()}]`)();
        const globalState = globalStatesById.get(globalStateId).store;

        const actionFunction: (...args: unknown[]) => unknown = Object.getOwnPropertyDescriptor(
          globalState.actions,
          actionName,
        )?.value;

        return actionFunction.apply(globalState.actions, args);
      }

      if (action === 'SET_STATE') {
        const { payload } = event.data;
        const { globalStateId, parameters: parametersString } = payload;
        const setter: unknown = Function(`return [${parametersString.trim()}]`)()[0];
        const globalState = globalStatesById.get(globalStateId).store;

        return globalState.setState.apply(globalState, [setter]);
      }

      if (action === 'RESTORE_STATE') {
        const { payload } = event.data;
        const { globalStateId, state } = payload;

        const globalState = globalStatesById.get(globalStateId).store;

        // restore the actual state
        const newState = formatFromStore(state);
        const { result: merged, error } = tryCatch(() => mergeState(globalState.getState(), newState));

        if (error) {
          console.warn(error);
          return;
        }

        // merge current state with restored state
        // the restore could be partial due non serializable data
        return globalState.setState.apply(globalState, [merged]);
      }
    },
  );
}

addDevtoolsListeners();
