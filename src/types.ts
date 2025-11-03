export type {
  StateApi,
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
  BaseMetadata,
  MetadataGetter,
  SelectorCallback,
  SubscriberParameters,
  SubscriptionCallback,
  StateHook,
  ActionCollectionConfig,
} from 'react-hooks-global-states/types';

export type LocalStorageConfig = {
  key: string | (() => string);

  /**
   * The function used to encrypt the local storage, it can be a custom function or a boolean value (true = atob)
   */
  encrypt?: boolean | ((value: string) => string);

  /**
   * The function used to decrypt the local storage, it can be a custom function or a boolean value (true = atob)
   */
  decrypt?: boolean | ((value: string) => string);
};
