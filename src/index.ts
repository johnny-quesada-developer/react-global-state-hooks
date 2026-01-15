/**
 * By handling the same structure as the original library,
 * We can add the specific overrides for web while keeping the modularity of the library.
 */
// #region base library exports copy of the original library index
export type {
  AnyFunction,
  ReadonlyHook,
  SelectHook,
  StateApi,
  ReadonlyStateApi,
  ObservableFragment,
  MetadataSetter,
  StateChanges,
  StoreTools,
  ActionCollectionResult,
  GlobalStoreCallbacks,
  UseHookOptions,
  UnsubscribeCallback,
  SubscribeCallbackConfig,
  SubscribeCallback,
  SubscribeToState,
  BaseMetadata,
  MetadataGetter,
  SelectorCallback,
  SubscriberParameters,
  SubscriptionCallback,
  StateHook,
  ActionCollectionConfig,
} from './types';

// classes
// export { GlobalStore } from './GlobalStore'; // overridden

// functions
// export { createGlobalState } from './createGlobalState'; // overridden

// utils
export { shallowCompare } from './shallowCompare';
export { uniqueId, type BrandedId, type UniqueId } from './uniqueId';
export { throwWrongKeyOnActionCollectionConfig } from './throwWrongKeyOnActionCollectionConfig';
export { isRecord } from './isRecord';
export { default as tryCatch, type TryCatchResult } from './tryCatch';

// context
export {
  type ContextProvider,
  type ContextHook,
  type InferContextApi,
  type ContextActionCollectionConfig,
  type ContextActionCollectionResult,
  type ContextStoreTools,
  type ContextStoreToolsExtensions,
  type ContextProviderExtensions,
  type ContextPublicApi,
  type ReadonlyContextPublicApi,
  type ReadonlyContextHook,
  type GlobalStoreContextCallbacks,
  type GlobalStoreCallbacks as ContextGlobalStoreCallbacks,
  type CreateContext,
  createContext,
} from './createContext';

// #endregion base library exports

export { type LocalStorageConfig, type ItemEnvelope } from './types';
export { default as GlobalStore } from './GlobalStore';
export {
  createGlobalState,
  type CreateGlobalState,
  type InferActionsType,
  type InferStateApi,
  AnyActions,
} from './createGlobalState';
