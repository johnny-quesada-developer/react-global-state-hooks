/**
 * By handling the same structure as the original library,
 * We can add the specific overrides for web while keeping the modularity of the library.
 */
// #region base library exports (parity with the web package, sourced from ./types).
// GlobalStore and createGlobalState are intentionally omitted here — this package overrides them
// with async-storage-aware variants further down. Several types (BaseMetadata, StateHook,
// StoreTools, MetadataSetter, MetadataGetter, ObservableFragment, ActionCollectionConfig,
// ActionCollectionResult, GlobalStoreCallbacks) are this package's async-aware redeclarations.
export type {
  ActionCollectionConfig,
  ActionCollectionResult,
  Any,
  AnyActions,
  AnyFunction,
  BaseMetadata,
  BrandedId,
  CleanupFunction,
  ContextActionCollectionConfig,
  ContextActionCollectionResult,
  ContextHook,
  ContextProvider,
  ContextProviderExtensions,
  ContextPublicApi,
  ContextStoreTools,
  ContextStoreToolsExtensions,
  CreateContext,
  CreateGlobalState,
  GlobalStoreCallbacks,
  GlobalStoreContextCallbacks,
  InferAPI,
  InferActionsType,
  InferContextApi,
  InferStateApi,
  MetadataGetter,
  MetadataSetter,
  ObservableFragment,
  ReadonlyContextHook,
  ReadonlyContextPublicApi,
  ReadonlyHook,
  ReadonlyStateApi,
  SelectHook,
  SelectorCallback,
  StateApi,
  StateChanges,
  StateHook,
  StoreTools,
  SubscribeCallback,
  SubscribeCallbackConfig,
  SubscribeToState,
  SubscriberParameters,
  SubscriptionCallback,
  UniqueId,
  UnsubscribeCallback,
  UseHookOptions,
} from './types';

// utils
export { shallowCompare } from './shallowCompare';
export { uniqueId } from './uniqueId';
export { throwWrongKeyOnActionCollectionConfig } from './throwWrongKeyOnActionCollectionConfig';
export { isRecord } from './isRecord';
export { actions } from './actions';

// context
export { createContext } from './createContext';

// #endregion base library exports

// react-native specific additions and overrides
export type { AsyncStorageConfig, AsyncMetadata, ItemEnvelope } from './types';
export { default as GlobalStore } from './GlobalStore';
export { createGlobalState } from './createGlobalState';
export { default as asyncStorageWrapper, type AsyncStorageManager } from './asyncStorageWrapper';
