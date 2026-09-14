import type { GlobalStoreParameter } from './tools/react';
import isNil from 'json-storage-formatter/isNil';
import { isFunction } from './asserts/asserts';
import type { GlobalStateJson } from './schema/GlobalStateJson';
import type { LocalStorageJson } from './schema/LocalStorageJson';
import type { ActionsCallbackJson } from './schema/ActionsCallbackJson';
import { softClone } from './tools/softClone';

type GlobalStateExtraArgs = {
  localStorage?: {
    key?: string;
  } | null;
};

const getLocalStorageMetadata = ({
  globalState,
  args,
}: {
  globalState: GlobalStoreParameter;
  args: unknown;
}): LocalStorageJson | null => {
  const argsLocalStorage = (args as GlobalStateExtraArgs | null | undefined)?.localStorage;
  const localStorageConfig = argsLocalStorage ?? globalState.localStorage;

  if (isNil(localStorageConfig?.key)) return null;
  if (typeof localStorageConfig.key !== 'string') return null;

  return {
    key: localStorageConfig.key,
  };
};

/**
 * Normalize the store metadata
 */
export const getGlobalStateMetaPayload = ({
  globalStatePath,
  globalState,
  globalStateId,
  args,
}: {
  globalStatePath: string;
  globalState: GlobalStoreParameter;
  globalStateId: string;
  args: unknown;
}): GlobalStateJson => {
  const { metadata } = globalState;

  const stateName = (() => {
    if (globalState._name) return globalState._name;

    return globalStateId;
  })();

  const localStorage = getLocalStorageMetadata({ globalState, args });

  const actions: ActionsCallbackJson = Object.keys((globalState.actionsConfig as Record<string, unknown>) ?? {}).reduce(
    (acc, key) => {
      const fn = (globalState.actionsConfig as Record<string, unknown>)[key];
      if (!isFunction(fn)) return acc;

      return {
        ...acc,
        [key]: {
          length: fn.length,
        },
      };
    },
    {}
  );

  const globalStoreMeta: GlobalStateJson = {
    globalStateId: globalStateId,
    localStorage,
    actions,
    name: stateName,
    metadata: softClone(metadata) ?? {},
    callbacks: Object.keys(globalState.callbacks ?? {}),
    initialState: softClone(globalState.state),
    globalStatePath,
    isContext: Boolean((args as { __devtools_isContextStore?: boolean } | null | undefined)?.__devtools_isContextStore),
  };

  return globalStoreMeta;
};
