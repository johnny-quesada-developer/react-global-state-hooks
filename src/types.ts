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
  // CreateGlobalState, // overridden below
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
} from 'react-hooks-global-states/types';

import type {
  StateHook,
  BaseMetadata,
  ActionCollectionConfig,
  ActionCollectionResult,
  GlobalStoreCallbacks,
  AnyActions,
  Any,
  StoreTools,
} from 'react-hooks-global-states';

export type TryCatchResult<T extends (...args: Any[]) => Any> = {
  result: ReturnType<T> | null;
  error: unknown;
};

/**
 * @description Configuration for persisting state in localStorage
 */
export type LocalStorageConfig<State, Metadata extends BaseMetadata> = {
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
  validator?: (
    args: { restored: unknown; initial: State },
    storeTools: StoreTools<State, AnyActions, Metadata>,
  ) => State | void;

  /**
   * @description Error callback invoked when an exception occurs during any persistence phase.
   * Use this to log or report issues without throwing.
   */
  onError?: (error: unknown, storeTools: StoreTools<State, AnyActions, Metadata>) => void;

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

    migrator: (
      args: { legacy: unknown; initial: State },
      storeTools: StoreTools<State, AnyActions, Metadata>,
    ) => State;
  };

  /**
   * @description High level overrides of the localstorage synchronization
   * Use it if you want to have full control of how the state is stored/retrieved.
   *
   * This disables versioning, migration, and selector
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

  /**
   * @description Optional selector to extract a subset of the state for storage.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selector?: (state: State) => any;
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

export interface CreateGlobalState {
  /**
   * Creates a global state hook.
   * @param state initial state value
   * @returns a state hook for your components
   * @example
   * const useCounter = createGlobalState(0);
   *
   * function Counter() {
   *   const [count, setCount] = useCounter();
   *   return (
   *     <div>
   *       <p>Count: {count}</p>
   *       <button onClick={() =>
   *         setCount(prev => prev + 1)
   *       }>Increment</button>
   *     </div>
   *   );
   * }
   */
  <State>(
    state: State | (() => State),
  ): StateHook<State, React.Dispatch<React.SetStateAction<State>>, BaseMetadata>;

  /**
   * Creates a global state hook that you can use across your application
   * @param state initial state value
   * @param args additional configuration for the global state
   * @param args.name optional name for debugging purposes
   * @param args.metadata optional non-reactive metadata associated with the state
   * @param args.callbacks optional lifecycle callbacks for the global state
   * @param args.actions optional actions to restrict state mutations [if provided `setState` will be nullified]
   * @param args.localStorage optional configuration to persist the state in local storage
   * @returns a state hook that you can use in your components
   *
   * @example
   * ```tsx
   * const useCounter = createGlobalState(0, {
   *   actions: {
   *     increase() {
   *       return ({ setState }) => {
   *         setState((c) => c + 1);
   *       };
   *     },
   *     decrease(amount: number) {
   *       return ({ setState }) => {
   *         setState((c) => c - amount);
   *       };
   *     },
   *   },
   * });
   *
   * function Counter() {
   *  const [count, {
   *    increase,
   *    decrease
   *  }] = useCounter();
   *
   *  return (
   *   <div>
   *    <p>Count: {count}</p>
   *    <button onClick={increase}>
   *      Increment
   *    </button>
   *    <button onClick={() => {
   *      decrease(1);
   *    }}>
   *      Decrement
   *    </button>
   *   </div>
   *  );
   * }
   * ```
   */
  <
    State,
    Metadata extends BaseMetadata,
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    ActionsConfig extends ActionCollectionConfig<State, Metadata> | null | {},
    PublicStateMutator = keyof ActionsConfig extends never | undefined
      ? React.Dispatch<React.SetStateAction<State>>
      : ActionCollectionResult<State, Metadata, NonNullable<ActionsConfig>>,
  >(
    state: State | (() => State),
    args: {
      name?: string;
      metadata?: Metadata | (() => Metadata);
      callbacks?: GlobalStoreCallbacks<Any, AnyActions, Any>;
      actions?: ActionsConfig;
      localStorage?: LocalStorageConfig<Any, Any>;
    },
  ): StateHook<State, PublicStateMutator, Metadata>;

  /**
   * Creates a global state hook that you can use across your application
   * @param state initial state value
   * @param args additional configuration for the global state
   * @param args.name optional name for debugging purposes
   * @param args.metadata optional non-reactive metadata associated with the state
   * @param args.callbacks optional lifecycle callbacks for the global state
   * @param args.actions optional actions to restrict state mutations [if provided `setState` will be nullified]
   * @param args.localStorage optional configuration to persist the state in local storage
   * @returns a state hook that you can use in your components
   *
   * @example
   * ```tsx
   * const useCounter = createGlobalState(0, {
   *   actions: {
   *     increase() {
   *       return ({ setState }) => {
   *         setState((c) => c + 1);
   *       };
   *     },
   *     decrease(amount: number) {
   *       return ({ setState }) => {
   *         setState((c) => c - amount);
   *       };
   *     },
   *   },
   * });
   *
   * function Counter() {
   *  const [count, {
   *    increase,
   *    decrease
   *  }] = useCounter();
   *
   *  return (
   *   <div>
   *    <p>Count: {count}</p>
   *    <button onClick={increase}>
   *      Increment
   *    </button>
   *    <button onClick={() => {
   *      decrease(1);
   *    }}>
   *      Decrement
   *    </button>
   *   </div>
   *  );
   * }
   * ```
   */
  <
    State,
    Metadata extends BaseMetadata,
    ActionsConfig extends ActionCollectionConfig<State, Metadata>,
    PublicStateMutator = ActionCollectionResult<State, Metadata, NonNullable<ActionsConfig>>,
  >(
    state: State | (() => State),
    args: {
      name?: string;
      metadata?: Metadata | (() => Metadata);
      callbacks?: GlobalStoreCallbacks<Any, AnyActions, Any>;
      actions: ActionsConfig;
      localStorage?: LocalStorageConfig<Any, Any>;
    },
  ): StateHook<State, PublicStateMutator, Metadata>;
}
