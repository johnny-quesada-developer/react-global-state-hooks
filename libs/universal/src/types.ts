import type GlobalStore from './GlobalStore';
import type { Context as ReactContext, PropsWithChildren } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Any = any;

export type AnyFunction = (...args: Any[]) => Any;

/**
 * @description Represents a hook that returns a readonly state.
 */
export interface ReadonlyHook<State, StateMutator, Metadata extends BaseMetadata>
  extends ReadonlyStateApi<State, StateMutator, Metadata> {
  /**
   * @description Returns the current state value.
   */
  (): State;

  /**
   * @description Returns a derived state based on the provided selector function.
   */
  <Derivate>(selector: (state: State) => Derivate, dependencies?: unknown[]): Derivate;

  /**
   * @description Returns a derived state based on the provided selector function and configuration.
   */
  <Derivate>(selector: (state: State) => Derivate, config?: UseHookOptions<Derivate, State>): Derivate;
}

/**
 * @description Hook to select a fragment of the state
 */
export interface SelectHook<State> {
  /**
   * @description Selects a fragment of the state using the provided selector function.
   * @param selector - The function to select a fragment of the state.
   * @param dependencies - Optional dependencies array to control re-evaluation.
   * @returns The selected fragment of the state.
   */
  <Selection>(selector: (state: State) => Selection, dependencies?: unknown[]): Selection;

  /**
   * @description Selects a fragment of the state using the provided selector function and configuration.
   * @param selector - The function to select a fragment of the state.
   * @param args - Configuration options for the selection.
   * @returns The selected fragment of the state.
   */
  <Selection>(selector: (state: State) => Selection, args?: UseHookOptions<Selection, State>): Selection;
}

/**
 * @description Represents the complete non-reactive API of a global state instance.
 * This API provides full control over the state, including reading, writing, subscribing,
 * and creating derived hooks or observable fragments.
 */
export type StateApi<State, StateMutator, Metadata extends BaseMetadata> = {
  /**
   * @description The metadata associated with the global state.
   * Metadata is additional non reactive information associated with the global state, reading it will not trigger re-renders.
   * To change the metadata use `setMetadata`.
   */
  readonly metadata: Metadata;

  /**
   * @deprecated Use the `metadata` property instead, e.g. `const { metadata } = api;`. Metadata is stable, so it is exposed directly.
   * Returns the metadata
   * Metadata is additional non reactive information associated with the global state
   */
  getMetadata: MetadataGetter<Metadata>;

  /**
   * Sets the metadata value
   * The metadata value is not reactive and wont trigger re-renders
   */
  setMetadata: MetadataSetter<Metadata>;

  /**
   * @description Contains the generated action functions if custom actions are defined.
   * If no actions are provided, this property is `null`.
   */
  actions: StateMutator extends AnyFunction ? null : StateMutator;

  /**
   * @description Provides direct access to the state updater.
   * Always available for testing purposes, even when actions are defined.
   * In production, prefer using actions when they are defined.
   */
  setState: React.Dispatch<React.SetStateAction<State>>;

  /**
   * @description Get the current state value
   */
  getState: () => State;

  /**
   * @description Subscribe to the state changes
   * You can subscribe to the whole state or to a fragment of the state by passing a selector as first parameter,
   * this can be used in non react environments to listen to the state changes
   */
  subscribe: SubscribeToState<State>;

  /***
   * @description Creates a new hooks that returns the result of the selector passed as a parameter
   * Your can create selector hooks of other selectors hooks and extract as many derived states as or fragments of the state as you want
   * The selector hook will be evaluated only if the result of the selector changes and the equality function returns false
   * you can customize the equality function by passing the isEqualRoot and isEqual parameters
   */
  createSelectorHook: <Selection>(
    selector: (state: State) => Selection,
    args?: Omit<UseHookOptions<Selection, State>, 'dependencies'> & {
      name?: string;
    },
  ) => ReadonlyHook<Selection, StateMutator, Metadata>;

  /**
   * @description Creates a function that allows you to subscribe to a fragment of the state
   * The observable selection will notify the subscribers only if the fragment changes and the equality function returns false
   * you can customize the equality function by passing the isEqualRoot and isEqual parameters
   */
  createObservable: <Selection>(
    this: ReadonlyStateApi<State, StateMutator, Metadata>,
    selector: (state: State) => Selection,
    args?: {
      isEqual?: (current: Selection, next: Selection) => boolean;
      isEqualRoot?: (current: State, next: State) => boolean;
      /**
       * @description Name of the observable fragment for debugging purposes
       */
      name?: string;
    },
  ) => ObservableFragment<Selection, StateMutator, Metadata>;

  /**
   * @description Selects a fragment of the state using the provided selector function.
   */
  select: SelectHook<State>;

  /**
   * @description Sugared hook to use the global state in React components
   * Allows you to tread the global hook as an store, with better semantics
   *
   * @example
   * ```tsx
   * const contacts = createContext<ContactType[]>([]);
   *
   * function ContactsList() {
   *   const [contacts, setContacts] = contacts.use();
   * ```
   *
   * This is more practical since the StateApi is slightly more complex than a simple hook
   *
   * @example
   * Using a global state:
   *
   * ```tsx
   * const [state, setState, metadata] = state.use();
   *
   * const selection = state.select((state) => state.someFragment);
   *
   * const unsubscribe = state.subscribe((state) => { ... });
   *
   * const useFragment = state.createSelectorHook((state) => state.someFragment);
   *
   * const observable = state.createObservable((state) => state.someFragment);
   * ```
   */
  use: StateHook<State, StateMutator, Metadata>;

  /**
   * @description Disposes the global state instance, cleaning up all resources and subscriptions.
   */
  dispose: () => void;

  /**
   * PLEASE USE CALLBACK-BASED INITIALIZERS FOR STATE AND METADATA IF YOU PLAN TO USE RESET OFTEN.
   *
   * @description Resets the store to its initial state and metadata as provided during creation.
   * This method is reserved for advanced use cases and testing scenarios, use with caution.
   * If the initial state and metadata are static values this may not work as you expect.
   */
  reset(): void;

  /**
   * @description Resets the store to a new initial state and re-runs initialization (including onInit callbacks).
   * Existing subscribers are maintained and notified of the new state.
   * Useful for testing scenarios where you need to reinitialize the store.
   * @param newState - The new initial state to reset to
   * @param newMetadata - The new metadata to set after reset
   */
  reset(newState: State, newMetadata: Metadata): void;

  /**
   * @deprecated
   * @description Useful for debugging purposes, exposes the current subscribers of the store
   * You'll probably not need to use this in your application
   */
  subscribers: Set<SubscriberParameters>;
};

/**
 * @description Readonly version of the StateApi, excluding mutative methods.
 */
export type ReadonlyStateApi<State, StateMutator, Metadata extends BaseMetadata> = Pick<
  StateApi<State, StateMutator, Metadata>,
  'dispose' | 'getState' | 'subscribe' | 'createSelectorHook' | 'createObservable' | 'subscribers'
>;

/**
 * @description Function that allows you to subscribe to a fragment of the state
 */
export type ObservableFragment<State, StateMutator, Metadata extends BaseMetadata> = SubscribeToState<State> &
  Pick<
    StateApi<State, StateMutator, Metadata>,
    'getState' | 'subscribe' | 'createSelectorHook' | 'createObservable' | 'dispose' | 'subscribers'
  >;

export interface StateHook<State, StateMutator, Metadata extends BaseMetadata>
  extends StateApi<State, StateMutator, Metadata> {
  /**
   * @description React hook that provides access to the state, state mutator, and metadata.
   */
  (): Readonly<[state: State, stateMutator: StateMutator, metadata: Metadata]>;

  /**
   * @description React hook that provides a derived state based on the provided selector function.
   */
  <Derivate>(
    selector: (state: State) => Derivate,
    dependencies?: unknown[],
  ): Readonly<[state: Derivate, stateMutator: StateMutator, metadata: Metadata]>;

  /**
   * @description React hook that provides a derived state based on the provided selector function and configuration.
   */
  <Derivate>(
    selector: (state: State) => Derivate,
    config?: UseHookOptions<Derivate, State>,
  ): Readonly<[state: Derivate, stateMutator: StateMutator, metadata: Metadata]>;
}

/**
 * @description Function to set the metadata value
 * The metadata value is not reactive and wont trigger re-renders
 */
export type MetadataSetter<Metadata extends BaseMetadata> = (
  setter: Metadata | ((metadata: Metadata) => Metadata),
) => void;

/**
 * @description Represents the changes in the state
 */
export type StateChanges<State> = {
  state: State;
  previousState: State | undefined;
  identifier: string | undefined;
};

/**
 * API for the actions of the global states
 **/
export type StoreTools<
  State,
  StateMutator = React.Dispatch<React.SetStateAction<State>>,
  Metadata extends BaseMetadata = BaseMetadata,
> = {
  /**
   * The actions available for the global state if provided
   */
  actions: StateMutator extends AnyFunction ? null : StateMutator;

  /**
   * @description Metadata associated with the global state.
   * Metadata is non-reactive; reading it will not trigger re-renders. To change it use `setMetadata`.
   */
  readonly metadata: Metadata;

  /**
   * @deprecated Use the `metadata` property instead, e.g. `const { metadata } = storeTools;`. Metadata is stable, so it is exposed directly.
   * @description Metadata associated with the global state
   */
  getMetadata: () => Metadata;

  /**
   * @description Current state value
   */
  getState: () => State;

  /**
   * @description Sets the metadata value
   */
  setMetadata: MetadataSetter<Metadata>;

  /**
   * @description Function to set the state value
   */
  setState: (
    setter: React.SetStateAction<State>,

    args?: {
      /**
       * @description Force update even if the state value did not change, this is for advanced use cases only
       */
      forceUpdate?: boolean;

      /**
       * @description Optional identifier visible on the devtools
       */
      identifier?: string;
    },
  ) => void;

  /**
   * @description Subscribe to the state changes
   * You can subscribe to the whole state or to a fragment of the state by passing a selector as first parameter,
   * this can be used in non react environments to listen to the state changes
   *
   * @example
   * ```ts
   * const unsubscribe = storeTools.subscribe((state) => {
   *   console.log('State changed:', state);
   * });
   *
   * // To unsubscribe later
   * unsubscribe();
   * ```
   */
  subscribe: SubscribeToState<State>;
};

/**
 * contract for the storeActionsConfig configuration
 */
export interface ActionCollectionConfig<
  State,
  Metadata extends BaseMetadata,
  ThisAPI = Record<string, (...parameters: Any[]) => unknown>,
> {
  readonly [key: string]: {
    (
      this: ThisAPI,
      ...parameters: Any[]
    ): (
      this: ThisAPI,
      storeTools: StoreTools<State, Record<string, (...parameters: Any[]) => unknown | void>, Metadata>,
    ) => unknown | void;
  };
}

/**
 * @description Resulting type of the action collection configuration
 */
export type ActionCollectionResult<
  State,
  Metadata extends BaseMetadata,
  ActionsConfig extends ActionCollectionConfig<State, Metadata>,
> = {
  [key in keyof ActionsConfig]: {
    (...params: Parameters<ActionsConfig[key]>): ReturnType<ReturnType<ActionsConfig[key]>>;
  };
};

export type CleanupFunction = () => void;

/**
 * Callbacks for the global store lifecycle events
 */
export type GlobalStoreCallbacks<State, StateMutator, Metadata extends BaseMetadata> = {
  /**
   * @description Called when the store is initialized
   */
  onInit?: (args: StoreTools<State, StateMutator, Metadata>) => void | Promise<void> | CleanupFunction;

  /**
   * @description Called when the state has changed
   */
  onStateChanged?: (args: StoreTools<State, StateMutator, Metadata> & StateChanges<State>) => void;

  /**
   * @description Called when a new subscription is created
   */
  onSubscribed?: (
    args: StoreTools<State, StateMutator, Metadata>,
    subscription: SubscriberParameters,
  ) => void;

  /**
   * @description Called to determine whether to prevent a state change
   */
  computePreventStateChange?: (
    args: StoreTools<State, StateMutator, Metadata> & StateChanges<State>,
  ) => boolean;

  /**
   * @description Called when the store is unmounted, only applicable in context stores
   */
  onUnMount?: (store: StoreTools<State, StateMutator, Metadata>) => void;
};

/**
 * @description Configuration options for the use hook
 */
export type UseHookOptions<State, TRoot = Any> = {
  isEqual?: (current: State, next: State) => boolean;
  isEqualRoot?: (current: TRoot, next: TRoot) => boolean;
  dependencies?: unknown[];
};

/**
 * @description Callback function to unsubscribe from the store changes
 */
export type UnsubscribeCallback = () => void;

/**
 * @description Configuration for the subscribe callback
 */
export type SubscribeCallbackConfig<State> = UseHookOptions<State> & {
  /**
   * By default the callback is executed immediately after the subscription
   */
  skipFirst?: boolean;
};

/**
 * Callback function to subscribe to the store changes
 */
export type SubscribeCallback<State> = (state: State) => void;

/**
 * @description Subscribe to the state changes
 * You can subscribe to the whole state or to a fragment of the state by passing a selector as first parameter
 * This can be used in non react environments to listen to the state changes
 */
export type SubscribeToState<State> = {
  /**
   * @description Subscribe to the whole state changes
   *
   * @example
   * ```ts
   * const unsubscribe = store.subscribe((state) => {
   *   console.log('State changed:', state);
   * });
   *
   * // To unsubscribe later
   * unsubscribe();
   * ```
   */
  (subscription: SubscribeCallback<State>, config?: SubscribeCallbackConfig<State>): UnsubscribeCallback;

  /**
   * @description Subscribe to a fragment of the state changes
   *
   * @example
   * ```ts
   * const unsubscribe = store.subscribe(
   *   (fragment) => {
   *     console.log('Fragment changed:', fragment);
   *   },
   *   (state) => {
   *     console.log('Selected fragment changed:', state.someFragment);
   *   }
   * );
   *
   * // To unsubscribe later
   * unsubscribe();
   * ```
   */
  <TDerivate>(
    selector: SelectorCallback<State, TDerivate>,
    subscription: SubscribeCallback<TDerivate>,
    config?: SubscribeCallbackConfig<TDerivate>,
  ): UnsubscribeCallback;
};

/**
 * @description Metadata, non reactive additional information associated with the global state
 */
export type BaseMetadata = Record<string, unknown>;

/**
 * @description Function to get the metadata
 */
export type MetadataGetter<Metadata extends BaseMetadata> = () => Metadata;

/**
 * @description Selector function to derive a fragment of the state
 */
export type SelectorCallback<State, TDerivate> = (state: State) => TDerivate;

/**
 * @description Parameters for the store subscription
 */
export type SubscriberParameters = {
  selector: SelectorCallback<Any, Any> | undefined;

  currentState: unknown;

  /**
   * @description notification callback
   */
  onStoreChange: SubscriptionCallback | (() => void);
} & UseHookOptions<Any> &
  SubscribeCallbackConfig<Any>;

/**
 * @description
 * This is the final listener of the store changes, it can be a subscription or a setState
 * @param {unknown} params - The parameters of the subscription
 * @param {unknown} params.state - The new state
 * @param {string} params.identifier - Optional identifier for the setState call
 */
export type SubscriptionCallback<State = unknown> = (
  params: { state: State },
  args: { identifier?: string },
) => void;

export type GlobalStoreContextCallbacks<State, StateMutator, Metadata extends BaseMetadata> = {
  /**
   * @description Optional callback invoked after the context is created,
   */
  onCreated?: (
    /**
     * @description Full context instance
     */
    storeTools: ContextStoreTools<State, StateMutator extends AnyFunction ? null : StateMutator, Metadata>,

    /**
     * @description Underlying store instance
     */
    store: GlobalStore<State, Metadata, unknown, Any>,
  ) => void;

  /**
   * @description Called when the context provider is mounted
   */
  onMounted?: (
    /**
     * @description Full context instance
     */
    storeTools: ContextStoreTools<State, StateMutator extends AnyFunction ? null : StateMutator, Metadata>,

    /**
     * @description Underlying store instance
     */
    store: GlobalStore<State, Metadata, unknown, Any>,
  ) => void | UnsubscribeCallback;

  /**
   * @description Called synchronously during every Provider render.
   *
   * Must be idempotent and must not produce external side effects
   * or retain references to the provided store.
   *
   * React may invoke renders that are later discarded.
   */
  onRender?: (
    /**
     * @description Full context instance
     */
    storeTools: ContextStoreTools<State, StateMutator extends AnyFunction ? null : StateMutator, Metadata>,

    /**
     * @description Underlying store instance
     */
    store: GlobalStore<State, Metadata, unknown, Any>,
  ) => void;
};

export type ContextStoreCallbacks<State, StateMutator, Metadata extends BaseMetadata> = GlobalStoreCallbacks<
  State,
  StateMutator,
  Metadata
> &
  GlobalStoreContextCallbacks<State, StateMutator, Metadata>;

/**
 * @description Resulting type of the action collection configuration
 */
export type ContextActionCollectionResult<
  State,
  Metadata extends BaseMetadata,
  ActionsConfig extends ContextActionCollectionConfig<State, Metadata>,
> = {
  [key in keyof ActionsConfig]: {
    (...params: Parameters<ActionsConfig[key]>): ReturnType<ReturnType<ActionsConfig[key]>>;
  };
};

/**
 * contract for the storeActionsConfig configuration
 */
export interface ContextActionCollectionConfig<
  State,
  Metadata extends BaseMetadata,
  ThisAPI = Record<string, (...parameters: Any[]) => unknown>,
> {
  readonly [key: string]: {
    (
      this: ThisAPI,
      ...parameters: Any[]
    ): (
      this: ThisAPI,
      storeTools: ContextStoreTools<
        State,
        Record<string, (...parameters: Any[]) => unknown | void>,
        Metadata
      >,
    ) => unknown | void;
  };
}

/**
 * @description Extensions methods for the context store tools
 */
export type ContextStoreToolsExtensions<State, StateMutator, Metadata extends BaseMetadata> = {
  /**
   * @description Main hook of the context
   *
   * @example
   * ```tsx
   * type CounterContext = import('../../stores/counter').CounterContext;
   *
   * const useLogCount = () => {
   *   return ({ use }: CounterContext) => {
   *     const count = use.select(s => s.count);
   *
   *     console.log('Count changed:', count);
   *   };
   * }
   *
   * // Usage in store
   * import useLogCount from './actions/useLogCount';
   *
   * const counter = createContext({ count: 0 }, {
   *    actions: {
   *      useLogCount,
   *    }
   * });
   *
   * // Usage in component
   * import counter from '../stores/counter';
   *
   * const CounterLogger = () => {
   *   // access to the actions is NOT-REACTIVE
   *   const { useLogCount } = counter.use.actions();
   *
   *   useLogCount();
   * }
   * ```
   */
  use: ContextHook<State, StateMutator, Metadata>;
};

/**
 * @description Store tools specialized for context usage
 */
export type ContextStoreTools<State, StateMutator, Metadata extends BaseMetadata> = StoreTools<
  State,
  StateMutator,
  Metadata
> &
  ContextStoreToolsExtensions<State, StateMutator, Metadata>;

/**
 * @description Extensions methods for the ContextProvider component
 */
export type ContextProviderExtensions<State, StateMutator, Metadata extends BaseMetadata> = {
  /**
   * Creates a provider wrapper which allows to capture the context value,
   * useful for testing purposes.
   * @param options configuration options for the provider wrapper
   * @param options.value optional initial state or initializer function
   * @param options.onCreated optional callback invoked after the context is created
   * @returns an object containing the wrapper component and a reference to the context value
   */
  makeProviderWrapper: (
    options?: {
      /**
       * @description Optional initial state or initializer function, useful for testing, storybooks, etc.
       */
      value?: State | ((initialValue: State) => State);
    } & GlobalStoreContextCallbacks<State, StateMutator extends AnyFunction ? null : StateMutator, Metadata>,
  ) => {
    /**
     * Provider for the context
     */
    wrapper: React.FC<
      PropsWithChildren<{
        /**
         * @description Optional initial state or initializer function, useful for testing, storybooks, etc.
         */
        value?: State | ((initialValue: State) => State);
      }>
    >;

    /**
     * Reference to the current context value
     */
    context: {
      /**
       * @description Current context value
       */
      current: ContextStoreTools<State, StateMutator extends AnyFunction ? null : StateMutator, Metadata>;

      /**
       * @description Underlying store instance
       */

      instance: GlobalStore<State, Metadata, unknown, Any>;
    };
  };
};

/**
 * @description Creates a React context provider component for the given global state.
 * @param value Optional initial state or initializer function, useful for testing.
 * @param onCreated Optional callback invoked after the context is created, receiving the full context instance.
 */
export type ContextProvider<State, StateMutator, Metadata extends BaseMetadata> = React.FC<
  PropsWithChildren<
    {
      /**
       * @description Optional initial state or initializer function, useful for testing, storybooks, etc.
       */
      value?: State | ((initialValue: State) => State);
    } & GlobalStoreContextCallbacks<State, StateMutator extends AnyFunction ? null : StateMutator, Metadata>
  >
> &
  ContextProviderExtensions<State, StateMutator, Metadata>;

/**
 * @description Represents a hook that returns a readonly state.
 */
export interface ReadonlyContextHook<State, StateMutator, Metadata extends BaseMetadata>
  extends ReadonlyContextPublicApi<State, StateMutator, Metadata> {
  /**
   * @description Returns the full state.
   */
  (): State;

  /**
   * @description Returns a derived value from the state using the provided selector function.
   * @param selector A function that selects a part of the state.
   * @param dependencies Optional array of dependencies to control when the selector is re-evaluated.
   * @returns The derived value from the state.
   */
  <Derivate>(selector: (state: State) => Derivate, dependencies?: unknown[]): Derivate;

  /**
   * @description Returns a derived value from the state using the provided selector function.
   * @param selector A function that selects a part of the state.
   * @param options Optional configuration for the selector hook.
   * @param options.isEqual Optional equality function to compare the selected fragment.
   * @param options.isEqualRoot Optional equality function to compare the root state.
   * @param options.dependencies Optional array of dependencies to control when the selector is re-evaluated.
   * @returns The derived value from the state.
   */
  <Derivate>(selector: (state: State) => Derivate, options?: UseHookOptions<Derivate, State>): Derivate;
}

/**
 * @description Hook for accessing a context's state, mutator (setState or actions), and metadata.
 * @returns A read-only tuple containing:
 *  - state: the current state, or the derived value when a selector is used
 *  - stateMutator: a function or actions collection to update the state
 *  - metadata: the current context metadata
 *
 * @example
 * ```tsx
 * // Simple usage (full state)
 * const [state, setState] = useTodosContext();
 *
 * // With a selector (preferred for render isolation)
 * const [todos, actions] = useTodosContext(s => s.todos);
 *
 * actions.setTodos(next);
 * ```
 */
export interface ContextHook<State, StateMutator, Metadata extends BaseMetadata>
  extends ContextPublicApi<State, StateMutator, Metadata> {
  /**
   * @description Retrieves the full state, state mutator (setState or actions), and metadata.
   */
  (): Readonly<[state: State, stateMutator: StateMutator, metadata: Metadata]>;

  /**
   * @description Retrieves a derived value from the state using the provided selector function.
   * @param selector A function that selects a part of the state.
   * @param dependencies Optional array of dependencies to control when the selector is re-evaluated.
   * @returns A read-only tuple containing the derived state, state mutator (setState or actions), and metadata.
   */
  <Derivate>(
    selector: (state: State) => Derivate,
    dependencies?: unknown[],
  ): Readonly<[state: Derivate, stateMutator: StateMutator, metadata: Metadata]>;

  /**
   * @description Retrieves a derived value from the state using the provided selector function.
   * @param selector A function that selects a part of the state.
   * @param dependencies Optional array of dependencies to control when the selector is re-evaluated.
   * @returns A read-only tuple containing the derived state, state mutator (setState or actions), and metadata.
   */
  <Derivate>(
    selector: (state: State) => Derivate,
    config?: UseHookOptions<Derivate, State>,
  ): Readonly<[state: Derivate, stateMutator: StateMutator, metadata: Metadata]>;
}

export type ContextPublicApi<State, StateMutator, Metadata extends BaseMetadata> = {
  /**
   * @description [NOT A HOOK, NON-REACTIVE]
   * Creates a derived hook that subscribes to a selected fragment of the context state.
   * The selector determines which portion of the state the new hook exposes.
   * This hook must be used within the corresponding context provider.
   *
   * @param selector A function that selects a part of the state.
   * @param args Optional configuration for the derived hook, including:
   *  - isEqual: A function to compare the current and next selected fragment for equality.
   *  - isEqualRoot: A function to compare the entire state for equality.
   *  - name: An optional name for debugging purposes.
   * @returns A new context hook that provides access to the selected fragment of the state,
   * along with the state mutator and metadata.
   *
   * @example
   * ```tsx
   * const useTodos = createContext({
   *   todos: [],
   *   filter: '',
   * }, {
   * actions: {
   *   setFilter(filter: string) {
   *   ...
   * });
   *
   * const useFilter = useTodos.createSelectorHook((state) => {
   *   return state.filter;
   * });
   *
   * function FilterComponent() {
   *   // The selector only listen to the selected fragment (filter)
   *   // But has access to the full actions collection
   *   const [filter, { setFilter }] = useFilter();
   *
   *   return (
   *     <input
   *       value={filter}
   *       onChange={(e) => setFilter(e.target.value)}
   *     />
   *   );
   * }
   * ```
   */
  createSelectorHook: <Derivate>(
    this: ReadonlyContextPublicApi<State, StateMutator, Metadata>,
    selector: (state: State) => Derivate,
    args?: Omit<UseHookOptions<Derivate, State>, 'dependencies'> & {
      name?: string;
    },
  ) => ReadonlyContextHook<Derivate, StateMutator, Metadata>;

  /**
   * @description [NON-REACTIVE]
   * Hook that provides non-reactive access to the context API.
   * This allows direct interaction with the context’s state, metadata, and actions
   * without triggering component re-renders.
   * @returns An object containing the context API methods and properties.
   */
  api: () => StateApi<State, StateMutator, Metadata>;

  /**
   * @description [NON-REACTIVE]
   *  Provides direct access to the context's actions, if available.
   */
  actions: () => StateMutator extends AnyFunction ? null : StateMutator;

  /**
   * @description Selects a fragment of the state using the provided selector function.
   */
  select: SelectHook<State>;

  /**
   * @description
   * Creates a hook that allows you to subscribe to a fragment of the state
   * The observable selection will notify the subscribers only if the fragment changes and the equality function returns false
   * you can customize the equality function by passing the isEqualRoot and isEqual parameters
   *
   * @example
   * ```tsx
   * const observable = store.use.observable(state => state.count);
   *
   * useEffect(() => {
   *   const unsubscribe = observable.subscribe(() => {
   *     // do something when the selected fragment changes
   *   });
   *
   *   return () => {
   *     unsubscribe();
   *   };
   * }, [observable]);
   * ```
   */
  observable: <Selection>(
    selector: (state: State) => Selection,
    args?: {
      isEqual?: (current: Selection, next: Selection) => boolean;
      isEqualRoot?: (current: State, next: State) => boolean;
      /**
       * @description Name of the observable fragment for debugging purposes
       */
      name?: string;
    },
  ) => ObservableFragment<Selection, StateMutator, Metadata>;

  /**
   * @description display name for debugging purposes
   */
  readonly displayName: string;
};

/**
 * @description Readonly version of the ContextPublicApi, expose by selectors and observables
 */
export type ReadonlyContextPublicApi<State, StateMutator, Metadata extends BaseMetadata> = Pick<
  ContextPublicApi<State, StateMutator, Metadata>,
  'createSelectorHook' | 'displayName'
> & {
  /**
   * @description Hook that provides non-reactive access to the context API.
   * This allows direct interaction with the context’s state, metadata, and actions
   * without triggering component re-renders.
   * @returns An object containing the context API methods and properties.
   */
  api: () => ReadonlyStateApi<State, StateMutator, Metadata>;
};

export interface CreateContext {
  /**
   * @description Creates a highly granular React context with its associated provider and state hook.
   * @param value Initial state value or initializer function.
   * @returns An object containing:
   * - **`use`** — A custom hook to read and mutate the context state.
   *   Supports selectors for granular subscriptions and returns `[state, stateMutator, metadata]`.
   * - **`Provider`** — A React component that provides the context to its descendants.
   *   It accepts an optional initial value and `onCreated` callback.
   * - **`Context`** — The raw React `Context` object for advanced usage, such as integration with
   *   external tools or non-React consumers.
   */
  <State, StateMutator = React.Dispatch<React.SetStateAction<State>>>(
    value: State | (() => State),
  ): {
    /**
     * @description Hook and API for interacting with the context.
     * This hook provides access to the context state, actions, and metadata.
     *
     * There are two ways to use the hook
     * @example
     * The more simple and familiar way is to use it as a regular hook
     *
     * ```tsx
     * const { Context, Provider, user: useUser} = createContext({ name: 'John', age: 30 });
     *
     * function UserProfile() {
     *  const [state, setState, metadata] = useUser();
     *
     *  ....
     * }
     * ```
     *
     * @example
     * The recommended, more sematic and easier to read way:
     *
     * ```tsx
     * const user = createContext({ name: 'John', age: 30 });
     *
     * <user.Provider>
     *   <UserProfile />
     * </user.Provider>
     *
     * function UserProfile() {
     *   const [state, setState, metadata] = user.use();
     *   const userContext = user.use.api();
     *   const userName = user.use.select(s => s.name);
     *   // ...
     * }
     */
    use: ContextHook<State, StateMutator, BaseMetadata>;

    /**
     * @description Provider for the context
     */
    Provider: ContextProvider<State, StateMutator, BaseMetadata>;

    /**
     * @description The raw React Context object
     */
    Context: ReactContext<ContextHook<State, StateMutator, BaseMetadata> | null>;
  };

  /**
   * @description Creates a highly granular React context with its associated provider and state hook.
   * @param value Initial state value or initializer function.
   * @param args Additional configuration for the context.
   * @param args.name Optional name for debugging purposes.
   * @param args.metadata Optional non-reactive metadata associated with the state.
   * @param args.callbacks Optional lifecycle callbacks for the context.
   * @param args.actions Optional actions to restrict state mutations [if provided `setState` will be nullified].
   * @returns An object containing:
   * - **`use`** — A custom hook to read and mutate the context state.
   *   Supports selectors for granular subscriptions and returns `[state, stateMutator, metadata]`.
   * - **`Provider`** — A React component that provides the context to its descendants.
   *   It accepts an optional initial value and `onCreated` callback.
   * - **`Context`** — The raw React `Context` object for advanced usage, such as integration with
   *   external tools or non-React consumers.
   */
  <
    State,
    Metadata extends BaseMetadata,
    ActionsConfig extends ContextActionCollectionConfig<State, Metadata> | null | {},
    StateMutator = keyof ActionsConfig extends never | undefined
      ? React.Dispatch<React.SetStateAction<State>>
      : ContextActionCollectionResult<State, Metadata, NonNullable<ActionsConfig>>,
  >(
    /**
     * @description Initial state value or initializer function.
     */
    value: State | (() => State),

    /**
     * @description Additional configuration for the context.
     * @param args.name Optional name for debugging purposes.
     * @param args.metadata Optional non-reactive metadata associated with the state.
     * @param args.callbacks Optional lifecycle callbacks for the context.
     * @param args.actions Optional actions to restrict state mutations [if provided `setState` will be nullified].
     */
    args: {
      name?: string;
      metadata?: Metadata | (() => Metadata);
      callbacks?: ContextStoreCallbacks<Any, AnyActions, Any>;
      actions?: ActionsConfig;
    },
  ): {
    /**
     * @description Hook and API for interacting with the context.
     * This hook provides access to the context state, actions, and metadata.
     *
     * There are two ways to use the hook
     * @example
     * The more simple and familiar way is to use it as a regular hook
     *
     * ```tsx
     * const { Context, Provider, user: useUser} = createContext({ name: 'John', age: 30 });
     *
     * function UserProfile() {
     *  const [state, setState, metadata] = useUser();
     *
     *  ....
     * }
     * ```
     *
     * @example
     * The recommended, more sematic and easier to read way:
     *
     * ```tsx
     * const user = createContext({ name: 'John', age: 30 });
     *
     * <user.Provider>
     *   <UserProfile />
     * </user.Provider>
     *
     * function UserProfile() {
     *   const [state, setState, metadata] = user.use();
     *   const userContext = user.use.api();
     *   const userName = user.use.select(s => s.name);
     *   // ...
     * }
     */
    use: ContextHook<State, StateMutator, Metadata>;

    /**
     * @description Provider for the context
     */
    Provider: ContextProvider<State, StateMutator, Metadata>;

    /**
     * @description Raw React Context object
     */
    Context: ReactContext<ContextHook<State, StateMutator, Metadata> | null>;
  };

  /**
   * @description Creates a highly granular React context with its associated provider and state hook.
   * @param value Initial state value or initializer function.
   * @param args Additional configuration for the context.
   * @param args.name Optional name for debugging purposes.
   * @param args.metadata Optional non-reactive metadata associated with the state.
   * @param args.callbacks Optional lifecycle callbacks for the context.
   * @param args.actions Optional actions to restrict state mutations [if provided `setState` will be nullified].
   * @returns An object containing:
   * - **`use`** — A custom hook to read and mutate the context state.
   *   Supports selectors for granular subscriptions and returns `[state, stateMutator, metadata]`.
   * - **`Provider`** — A React component that provides the context to its descendants.
   *   It accepts an optional initial value and `onCreated` callback.
   * - **`Context`** — The raw React `Context` object for advanced usage, such as integration with
   *   external tools or non-React consumers.
   */
  <
    State,
    Metadata extends BaseMetadata,
    ActionsConfig extends ContextActionCollectionConfig<State, Metadata>,
  >(
    /**
     * @description Initial state value or initializer function.
     */
    value: State | (() => State),

    /**
     * @description Additional configuration for the context.
     * @param args.name Optional name for debugging purposes.
     * @param args.metadata Optional non-reactive metadata associated with the state.
     * @param args.callbacks Optional lifecycle callbacks for the context.
     * @param args.actions Optional actions to restrict state mutations [if provided `setState` will be nullified].
     */
    args: {
      name?: string;
      metadata?: Metadata | (() => Metadata);
      callbacks?: ContextStoreCallbacks<Any, AnyActions, Any>;
      actions: ActionsConfig;
    },
  ): {
    /**
     * @description Hook and API for interacting with the context.
     * This hook provides access to the context state, actions, and metadata.
     *
     * There are two ways to use the hook
     * @example
     * The more simple and familiar way is to use it as a regular hook
     *
     * ```tsx
     * const { Context, Provider, user: useUser} = createContext({ name: 'John', age: 30 });
     *
     * function UserProfile() {
     *  const [state, setState, metadata] = useUser();
     *
     *  ....
     * }
     * ```
     *
     * @example
     * The recommended, more sematic and easier to read way:
     *
     * ```tsx
     * const user = createContext({ name: 'John', age: 30 });
     *
     * <user.Provider>
     *   <UserProfile />
     * </user.Provider>
     *
     * function UserProfile() {
     *   const [state, setState, metadata] = user.use();
     *   const userContext = user.use.api();
     *   const userName = user.use.select(s => s.name);
     *   // ...
     * }
     */
    use: ContextHook<State, ContextActionCollectionResult<State, Metadata, ActionsConfig>, Metadata>;

    /**
     * @description Provider for the context
     */
    Provider: ContextProvider<State, ContextActionCollectionResult<State, Metadata, ActionsConfig>, Metadata>;

    /**
     * @description Raw React Context object
     */
    Context: ReactContext<ContextHook<
      State,
      ContextActionCollectionResult<State, Metadata, ActionsConfig>,
      Metadata
    > | null>;
  };
}

/**
 * @description Infers the context API type
 *
 * @example
 * ```ts
 * const counter = createContext(0);
 *
 * type CounterContextApi = InferContextApi<typeof counter.Context>;
 *
 * // Equivalent to:
 * ContextApi<number, React.Dispatch<React.SetStateAction<number>>, BaseMetadata>;
 * ```
 */
export type InferContextApi<Context extends ReactContext<ContextHook<Any, Any, Any> | null>> =
  NonNullable<React.ContextType<Context>> extends ContextHook<infer State, infer StateMutator, infer Metadata>
    ? ContextStoreTools<State, StateMutator extends AnyFunction ? null : StateMutator, Metadata>
    : never;

/**
 * Typescript is unable to infer the actions type correctly for the lifecycle callbacks
 * so we use a generic AnyActions type here to bypass that limitation.
 *
 * The parameter could still be typed before using it with
 * ```ts
 * type StoreTools = InferStateApi<typeof <hook>>;
 *
 * onInit: (tools) => {
 *   const storeTools = tools as StoreTools;
 *   // ...
 * }
 *
 * or when dealing with context:
 *
 * type ContextApi = InferContextApi<typeof <context>>;
 *
 * onInit: (tools) => {
 *   const storeTools = tools as ContextApi;
 *   // ...
 * }
 * ```
 */
export type AnyActions = Record<string, (...args: Any[]) => Any>;

export interface CreateGlobalState {
  /**
   * Creates a global state hook.
   * @param state initial state value or a callback function that returns the initial state
   * @returns a state hook for your components
   *
   * @example
   * ```tsx
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
   * ```
   *
   * @example Using a callback to initialize state
   * ```tsx
   * const useCounter = createGlobalState(() => {
   *   // Expensive computation or conditional logic
   *   return localStorage.getItem('count') ? parseInt(localStorage.getItem('count')) : 0;
   * });
   * ```
   *
   * @example You can also use a more semantic and declarative approach
   * ```tsx
   * const counter = createGlobalState(0);
   *
   * function Counter() {
   *   const [count, setCount] = counter.use();
   *   const count = counter.use.select();
   *
   *   counter.setState(prev => prev + 1);
   *
   *   // if you have actions
   *   counter.actions.someAction();
   * ```
   */
  <State>(
    state: State | (() => State),
  ): StateHook<State, React.Dispatch<React.SetStateAction<State>>, BaseMetadata>;

  /**
   * Creates a global state hook that you can use across your application
   * @param state initial state value or a callback function that returns the initial state
   * @param args additional configuration for the global state
   * @param args.name optional name for debugging purposes
   * @param args.metadata optional non-reactive metadata associated with the state (can be a value or callback)
   * @param args.callbacks optional lifecycle callbacks for the global state
   * @param args.actions optional actions to restrict state mutations [if provided `setState` will be nullified]
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
   *
   * @example Using callbacks for state and metadata initialization
   * ```tsx
   * const useAuth = createGlobalState(
   *   () => ({ user: null, token: localStorage.getItem('token') }),
   *   {
   *     metadata: () => ({ createdAt: Date.now() }),
   *   }
   * );
   * ```
   */
  <
    State,
    Metadata extends BaseMetadata,
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
    },
  ): StateHook<State, PublicStateMutator, Metadata>;

  /**
   * Creates a global state hook that you can use across your application
   * @param state initial state value or a callback function that returns the initial state
   * @param args additional configuration for the global state
   * @param args.name optional name for debugging purposes
   * @param args.metadata optional non-reactive metadata associated with the state (can be a value or callback)
   * @param args.callbacks optional lifecycle callbacks for the global state
   * @param args.actions optional actions to restrict state mutations [if provided `setState` will be nullified]
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
    },
  ): StateHook<State, PublicStateMutator, Metadata>;
}

/**
 * Infers the actions type from a StateHook
 * @example
 * ```ts
 * type CounterActions = InferActionsType<typeof useCounter>;
 * ```
 */
export type InferActionsType<Hook extends StateHook<Any, Any, Any>> = ReturnType<Hook>['1'];

/**
 * Infers the StoreTools type from a StateHook, useful to split actions code
 *
 * @example
 * ```ts
 * type CounterStoreTools = InferStateApi<typeof useCounter>;
 * ```
 */
export type InferStateApi<Hook extends StateHook<Any, Any, Any>> =
  Hook extends StateHook<infer State, infer PublicStateMutator, infer Metadata>
    ? StoreTools<State, PublicStateMutator, Metadata>
    : never;

/**
 * Branded unique identifier
 */
export type BrandedId<T extends string | undefined> = `${T extends string ? T : ''}${string}` & {
  __brand: T;
};

export interface UniqueId {
  /**
   * Generates a unique identifier string, optionally prefixed.
   *
   * @example
   * uniqueId();           // "k9j3n5x8q2"
   * type Id1 = `${string}` & { __brand: '' };
   */
  (): BrandedId<''>;

  /**
   * Generates a unique identifier string, optionally prefixed.
   *
   * @example
   * uniqueId('user:');    // "user:k9j3n5x8q2"
   * type Id2 = `user:${string}` & { __brand: 'user:' };
   */
  <T extends string>(prefix: T): BrandedId<T>;

  /**
   * Creates a reusable unique ID generator for a specific prefix.
   *
   * @example
   * const makeOrderId = uniqueId.for('order:');
   * const id = makeOrderId(); // "order:k9j3n5x8q2"
   * type OrderId = `order:${string}` & { __brand: 'order:' };
   */
  for<T extends string>(
    prefix: T,
  ): {
    (): `${T}${string}` & { __brand: T };

    /**
     * Checks if the given value matches the branded ID for this prefix.
     */
    is(value: unknown): value is `${T}${string}` & { __brand: T };

    /**
     * Asserts that the value matches this branded ID, throws otherwise.
     */
    assert(value: unknown): asserts value is `${T}${string}` & { __brand: T };

    /**
     * Returns a strictly branded generator using a custom symbol brand.
     */
    strict<Brand extends symbol>(): {
      (): `${T}${string}` & { __brand: Brand };
      is(value: unknown): value is `${T}${string}` & { __brand: Brand };
      assert(value: unknown): asserts value is `${T}${string}` & { __brand: Brand };
    };
  };

  /**
   * Creates a reusable unique ID generator without a prefix.
   */
  of<T extends string>(): () => string & { __brand: T };

  /**
   * Creates a strictly branded unique ID generator without a prefix.
   */
  strict<Brand extends symbol>(): () => string & { __brand: Brand };
}

/**
 * Infers the appropriate API of the store
 */
export type InferAPI<T> =
  T extends React.Context<Any>
    ? InferContextApi<T>
    : T extends StateHook<Any, Any, Any>
      ? InferStateApi<T>
      : T extends {
            Context: React.Context<Any>;
          }
        ? InferContextApi<T['Context']>
        : never;

export type DerivedActionsConfig<ParentApi extends StoreTools<Any, Any, Any>> = {
  readonly [key: string]: {
    (
      ...parameters: Any[]
    ): (
      storeTools: StoreTools<
        ReturnType<ParentApi['getState']>,
        ParentApi['actions'],
        ReturnType<ParentApi['getMetadata']>
      >,
    ) => Any;
  };
};

export type DerivedActionsBuilder<ParentApi extends StoreTools<Any, Any, Any>> = {
  /**
   * @description
   *
   */
  <
    ActionsConfig extends {
      readonly [key: string]: {
        (
          ...parameters: Any[]
        ): (
          storeTools: StoreTools<
            ReturnType<ParentApi['getState']>,
            ParentApi['actions'],
            ReturnType<ParentApi['getMetadata']>
          >,
        ) => Any;
      };
    },
  >(
    actions: ActionsConfig,
  ): (
    api: StoreTools<Any, Any, Any>,
  ) => ActionCollectionResult<
    ReturnType<ParentApi['getState']>,
    ReturnType<ParentApi['getMetadata']>,
    ActionsConfig
  >;
};
