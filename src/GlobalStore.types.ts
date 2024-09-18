import * as GlobalStoreBase from 'react-hooks-global-states';

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
    key?: string;

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

export type GlobalStoreConfig<State, Metadata> =
  GlobalStoreBase.GlobalStoreConfig<State, Metadata> & LocalStorageConfig;

/**
 * @description
 * Configuration of the custom global hook
 */
export type CustomGlobalHookParams<TCustomConfig, TMetadata> =
  GlobalStoreBase.CustomGlobalHookBuilderParams<TCustomConfig, TMetadata> &
    LocalStorageConfig;
