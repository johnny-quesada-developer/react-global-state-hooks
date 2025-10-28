/**
 * By handling the same structure as the original library,
 * We can add the specific overrides for web while keeping the modularity of the library.
 */
// #region base library exports copy of the original library index
export type {
  StateSetter,
  HookExtensions,
  ObservableFragment,
  MetadataSetter,
  StateChanges,
  StoreTools,
  ActionCollectionResult,
  GlobalStoreCallbacks,
  UseHookConfig,
  UnsubscribeCallback,
  SubscribeCallbackConfig,
  SubscribeCallback,
  StateGetter,
  BaseMetadata,
  MetadataGetter,
  CustomGlobalHookBuilderParams,
  SelectorCallback,
  SubscriberParameters,
  SubscriptionCallback,
  StateHook,
  ActionCollectionConfig,
} from './types';

// classes
// export { GlobalStore } from './GlobalStore'; // overridden
// export { GlobalStoreAbstract } from './GlobalStoreAbstract';// overridden

// functions
// export { createGlobalState } from './createGlobalState'; // overridden
// export { createCustomGlobalState } from './createCustomGlobalState'; // overridden

// utils
export { shallowCompare } from './shallowCompare';
export { uniqueId } from './uniqueId';
export { throwWrongKeyOnActionCollectionConfig } from './throwWrongKeyOnActionCollectionConfig';
export { isRecord } from './isRecord';
export { useStableState } from './useStableState';

// context
export {
  type Context,
  type ContextProvider,
  type ContextHook,
  type CreateContext,
  createContext,
} from './createContext';

// #endregion base library exports

export { type LocalStorageConfig } from './types';
export { GlobalStore } from './GlobalStore';
export { GlobalStoreAbstract } from './GlobalStoreAbstract';
export { CreateGlobalState, createGlobalState } from './createGlobalState';
export { createCustomGlobalState, CustomCreateGlobalState } from './createCustomGlobalState';
export { getLocalStorageItem } from './getLocalStorageItem';
export { setLocalStorageItem } from './setLocalStorageItem';

export { generateStackHash } from './generateStackHash';
