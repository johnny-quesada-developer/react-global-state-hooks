/**
 * The commented exports are the ones that are overridden by this library.
 * The intention is to extend the capabilities to specially web development.
 * The original library is intended to be used just with react,
 */
export {
  clone,
  isNil,
  isNumber,
  isBoolean,
  isString,
  isDate,
  isRegex,
  isFunction,
  isPrimitive,
  formatFromStore,
  formatToStore,
  throwNoSubscribersWereAdded,
  //   GlobalStore,
  //   GlobalStoreAbstract,
  //   createGlobalStateWithDecoupledFuncs,
  //   createGlobalState,
  //   createCustomGlobalStateWithDecoupledFuncs,
  createDerivate,
  createDerivateEmitter,
  shallowCompare,
  debounce,
  combineAsyncGettersEmitter,
  combineRetrieverEmitterAsynchronously,
  combineAsyncGetters,
  combineRetrieverAsynchronously,

  // types
  StateSetter,
  StateHook,
  MetadataSetter,
  StateChanges,
  StoreTools,
  ActionCollectionConfig,
  ActionCollectionResult,
  // GlobalStoreConfig,
  UseHookConfig,
  UnsubscribeCallback,
  SubscribeCallbackConfig,
  SubscribeCallback,
  SubscriberCallback,
  StateGetter,
  Subscribe,
  // createStateConfig,
  CustomGlobalHookBuilderParams,
  // CustomGlobalHookParams,
  SelectorCallback,
  SubscribeToEmitter,
  SubscriberParameters,
  SubscriptionCallback,
  SetStateCallback,
  // createStatefulContext,
  BaseMetadata,
} from 'react-hooks-global-states';

export {
  LocalStorageConfig,
  GlobalStoreConfig,
  CustomGlobalHookParams,
} from './GlobalStore.types';

export { GlobalStore } from './GlobalStore';
export { GlobalStoreAbstract } from './GlobalStoreAbstract';

export {
  createGlobalState,
  createCustomGlobalState,
} from './GlobalStore.functionHooks';

export { getLocalStorageItem, setLocalStorageItem } from './GlobalStore.utils';
export * from './GlobalStore.context';
