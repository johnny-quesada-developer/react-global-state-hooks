export type {
  StateApi,
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
  BaseMetadata,
  MetadataGetter,
  SelectorCallback,
  SubscriberParameters,
  SubscriptionCallback,
  StateHook,
  ActionCollectionConfig,
} from 'react-hooks-global-states/types';

/**
 * @description Configuration for persisting state in localStorage
 */
export type LocalStorageConfig<State> = {
  /**
   * @description The key used to store the item in localStorage.
   */
  key: string;

  /**
   * @description Validator function to ensure the integrity of the restored state.
   * Receives the restored value and the initial state... If the function returns a value then
   * that value is used as the new state. If it returns `void` (undefined) then the restored state is used
   * and the localStorage is updated accordingly.
   *
   * Executes after every initialization from localStorage, including after migration.
   *
   * @example
   * ```ts
   * validator: ({ restored, initial }) => {
   *   if (typeof restored !== 'number') {
   *     return initial;
   *   }
   *
   *   return restored;
   * }
   * ```
   */
  validator: (args: { restored: unknown; initial: State }) => State | void;

  /**
   * @description Error callback invoked when an exception occurs during any persistence phase.
   * Use this to log or report issues without throwing.
   */
  onError?: (error: unknown) => void;

  versioning?: {
    /**
     * @description Current schema version for this item. When the stored version differs,
     * the `migrator` function is invoked to upgrade the stored value.
     * @default -1
     * @example
     * ```ts
     * {
     *   key: 'counter',
     *   version: 1
     * }
     * ```
     */
    version: string | number;

    /**
     * @description Called when a stored value is found with a different version.
     * Receives the raw stored value and must return the upgraded `State`.
     * If and error is thrown during migration, the `onError` callback is invoked
     * and the state falls back to the initial value.
     */

    migrator: (args: { legacy: unknown; initial: State }) => State;
  };

  /**
   * @description High level overrides of the localstorage synchronization
   * Use it if you want to have full control of how the state is stored/retrieved.
   *
   * This disables versioning, migration
   */
  adapter?: {
    /**
     * @description Custom setter for the stored value associated with `key`.
     */
    setItem: (key: string, value: State) => void;

    /**
     * @description Custom getter for the stored value associated with `key`.
     * Should return the previously stored value (parsed/decoded to `State`) for that key.
     */
    getItem: (key: string) => State;
  };
};

/**
 * @description Structure of the item stored in localStorage
 */
export type ItemEnvelope<T> = {
  /**
   * @description Actual stored state
   */
  s: T;

  /**
   * @description Version of the stored state
   */
  v?: string | number;
};
