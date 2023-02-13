import * as TGlobalStoreBase from 'react-native-global-state-hooks/lib/GlobalStore.types';

export type StateSetter<TState> = TGlobalStoreBase.StateSetter<TState>;

export type StateChanges<TState> = TGlobalStoreBase.StateChanges<TState>;

export type StoreTools<TState, TMetadata = null> = TGlobalStoreBase.StoreTools<
  TState,
  TMetadata
>;

export interface ActionCollectionConfig<TState, TMetadata>
  extends TGlobalStoreBase.ActionCollectionConfig<TState, TMetadata> {}

export type ActionCollectionResult<
  TState,
  TMetadata,
  TStateSetter extends
    | ActionCollectionConfig<TState, TMetadata>
    | StateSetter<TState> = StateSetter<TState>
> = TGlobalStoreBase.ActionCollectionResult<TState, TMetadata, TStateSetter>;

export type StateConfigCallbackParam<
  TState,
  TMetadata,
  TStateSetter extends
    | ActionCollectionConfig<TState, TMetadata>
    | StateSetter<TState> = StateSetter<TState>
> = TGlobalStoreBase.StateConfigCallbackParam<TState, TMetadata, TStateSetter>;

export type StateChangesParam<
  TState,
  TMetadata,
  TStateSetter extends
    | ActionCollectionConfig<TState, TMetadata>
    | StateSetter<TState> = StateSetter<TState>
> = TGlobalStoreBase.StateChangesParam<TState, TMetadata, TStateSetter>;

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
    | TGlobalStoreBase.ActionCollectionConfig<TState, TMetadata>
    | TGlobalStoreBase.StateSetter<TState> = TGlobalStoreBase.StateSetter<TState>
> = TGlobalStoreBase.GlobalStoreConfig<TState, TMetadata, TStateSetter> & {
  localStorageKey?: string;
  encrypt?: boolean | ((value: string) => string);
  decrypt?: boolean | ((value: string) => string);
};
