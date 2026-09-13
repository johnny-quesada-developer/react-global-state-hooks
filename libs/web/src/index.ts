/**
 * By handling the same structure as the original library,
 * We can add the specific overrides for web while keeping the modularity of the library.
 */
// #region base library exports copy of the original library index
export type {
  ActionCollectionConfig,
  ActionCollectionResult,
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
  Any,
  TryCatchResult,
  LocalStorageConfig,
  ItemEnvelope,
} from './types';

// classes
export { GlobalStore } from './GlobalStore';

// core
export { createGlobalState } from './createGlobalState';
export { createContext } from './createContext';

// utils
export { shallowCompare } from './shallowCompare';
export { uniqueId } from './uniqueId';
export { throwWrongKeyOnActionCollectionConfig } from './throwWrongKeyOnActionCollectionConfig';
export { isRecord } from './isRecord';
export { actions } from './actions';
