/**
 * The commented exports are the ones that are overridden by this library.
 * The intention is to extend the capabilities to specially web development.
 * The original library is intended to be used just with react,
 * it does not include any react-native specific code or dependency.
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
  combineAsyncGetters,

  // types
  StateSetter,
  StateHook,
  AvoidNever,
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
} from 'react-native-global-state-hooks';

export {
  LocalStorageConfig,
  GlobalStoreConfig,
  createStateConfig,
  CustomGlobalHookParams,
} from './GlobalStore.types';

export { GlobalStore } from './GlobalStore';
export { GlobalStoreAbstract } from './GlobalStoreAbstract';

export {
  createGlobalStateWithDecoupledFuncs,
  createGlobalState,
  createCustomGlobalStateWithDecoupledFuncs,
} from './GlobalStore.functionHooks';

export { getLocalStorageItem, setLocalStorageItem } from './GlobalStore.utils';
