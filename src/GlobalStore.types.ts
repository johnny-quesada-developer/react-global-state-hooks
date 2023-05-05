import * as GlobalStoreBase from 'react-native-global-state-hooks';

/**
 * Configuration of the local storage (optional)
 */
export type LocalStorageConfig = {
  /**
   * Local storage configuration
   */
  localStorage?: {
    /**
     * The key of the local storage
     */
    localStorageKey?: string;

    /**
     * The function used to encrypt the local storage, it can be a custom function or a boolean value (true = atob)
     */
    encrypt?: boolean | ((value: string) => string);

    /**
     * The function used to decrypt the local storage, it can be a custom function or a boolean value (true = atob)
     */
    decrypt?: boolean | ((value: string) => string);
  };
};

/**
 * Configuration of the store (optional) - if you don't need to use the store configuration you don't need to pass this parameter
 * @param {StateConfigCallbackParam<TState, TMetadata> => void} onInit - callback function called when the store is initialized
 * @param {StateConfigCallbackParam<TState, TMetadata> => void} onSubscribed - callback function called every time a component is subscribed to the store
 * @param {StateChangesParam<TState, TMetadata> => boolean} computePreventStateChange - callback function called every time the state is changed and it allows you to prevent the state change
 * @param {StateChangesParam<TState, TMetadata> => void} onStateChanged - callback function called every time the state is changed
 * @template TState - the type of the state
 * @template TMetadata - the type of the metadata (optional) - if you don't pass an metadata as a parameter, you can pass null
 * @template {ActionCollectionConfig<TState,TMetadata> | null} TStateSetter - the configuration of the API (optional) - if you don't pass an API as a parameter, you can pass null
 * */
export type GlobalStoreConfig<
  TState,
  TMetadata,
  TStateSetter extends
    | GlobalStoreBase.ActionCollectionConfig<TState, TMetadata>
    | GlobalStoreBase.StateSetter<TState> = GlobalStoreBase.StateSetter<TState>
> = GlobalStoreBase.GlobalStoreConfig<TState, TMetadata, TStateSetter> &
  LocalStorageConfig;

/**
 * Configuration of the state (optional) - if you don't need to use the state configuration you don't need to pass this parameter
 */
export type createStateConfig<
  TState,
  TMetadata,
  TActions extends GlobalStoreBase.ActionCollectionConfig<
    TState,
    TMetadata
  > | null = null
> = GlobalStoreBase.createStateConfig<TState, TMetadata, TActions> &
  LocalStorageConfig;

/**
 * @description
 * Configuration of the custom global hook
 */
export type CustomGlobalHookParams<
  TCustomConfig,
  TState,
  TMetadata,
  TActions extends GlobalStoreBase.ActionCollectionConfig<
    TState,
    TMetadata
  > | null
> = GlobalStoreBase.CustomGlobalHookParams<
  TCustomConfig,
  TState,
  TMetadata,
  TActions
> &
  LocalStorageConfig;
