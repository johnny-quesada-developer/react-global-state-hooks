import { useDebugValue, useMemo, useRef, useSyncExternalStore } from 'react';
import type {
  ActionCollectionConfig,
  GlobalStoreCallbacks,
  ActionCollectionResult,
  MetadataSetter,
  UseHookOptions,
  SubscribeCallbackConfig,
  SubscribeCallback,
  SelectorCallback,
  SubscriberParameters,
  StateHook,
  BaseMetadata,
  StateChanges,
  StoreTools,
  ObservableFragment,
  StateApi,
  UnsubscribeCallback,
  AnyFunction,
  ReadonlyHook,
  ReadonlyStateApi,
  SelectHook,
  CleanupFunction,
} from './types';
import isFunction from 'json-storage-formatter/isFunction';
import isRecord from './isRecord';
import shallowCompare, { isArray } from './shallowCompare';
import throwWrongKeyOnActionCollectionConfig from './throwWrongKeyOnActionCollectionConfig';
import uniqueId from './uniqueId';
import debugProps from './GlobalStore.debugProps';

/**
 * The GlobalStore class is the main class of the library and it is used to create a GlobalStore instances
 * */
export class GlobalStore<
  State,
  Metadata extends BaseMetadata,
  ActionsConfig extends ActionCollectionConfig<State, Metadata> | undefined | unknown,
  PublicStateMutator = keyof ActionsConfig extends never | undefined
    ? React.Dispatch<React.SetStateAction<State>>
    : ActionCollectionResult<State, Metadata, NonNullable<ActionsConfig>>,
> {
  protected cleanupFunctions: CleanupFunction[] = [];

  protected _name: string;

  public actionsConfig: ActionsConfig | null = null;

  public callbacks: GlobalStoreCallbacks<State, PublicStateMutator, Metadata> | null = null;

  public metadata: Metadata;

  /**
   * @description If the actionsConfig is defined, this will be a map of actions that can be used to modify or interact with the state
   * */
  public actions: PublicStateMutator extends AnyFunction ? null : PublicStateMutator =
    null as PublicStateMutator extends AnyFunction ? null : PublicStateMutator;

  public storeTools!: StoreTools<State, PublicStateMutator, Metadata>;

  /**
   * @description The main hook that will be used to interact with the global state
   */
  public use!: StateHook<State, PublicStateMutator, Metadata>;

  /**
   * @deprecated
   * @description Set of subscribers that are listening to state changes
   * Useful for debugging purposes... You'll probably not need to use this in your application
   */
  public subscribers = new Set<SubscriberParameters>();

  public state: State;

  // if the initial state is provided as a function, we store the function reference here
  protected stateCallback?: () => State;

  // if the initial metadata is provided as a function, we store the function reference here
  protected metadataCallback?: () => Metadata;

  constructor(state: State | (() => State));

  constructor(
    state: State | (() => State),
    args: {
      metadata?: Metadata | (() => Metadata);
      callbacks?: GlobalStoreCallbacks<State, PublicStateMutator, Metadata>;
      actions?: ActionsConfig;
      name?: string;
    },
  );

  constructor(
    state: State | (() => State),
    args: {
      metadata?: Metadata | (() => Metadata);
      callbacks?: GlobalStoreCallbacks<State, PublicStateMutator, Metadata>;
      actions?: ActionsConfig;
      name?: string;
    } = { metadata: {} as Metadata },
  ) {
    const { metadata, callbacks, actions, name: storeName } = args;

    if (isFunction(state)) this.stateCallback = state;
    if (isFunction(metadata)) this.metadataCallback = metadata;

    this._name = storeName ?? uniqueId('gs:');

    this.state = this.stateCallback ? this.stateCallback() : (state as State);
    this.metadata = this.metadataCallback ? this.metadataCallback() : ((metadata ?? {}) as Metadata);

    this.callbacks = callbacks ?? null;
    this.actionsConfig = actions ?? null;

    if (debugProps.isDevToolsPresent) {
      const hookStack = new Error().stack ?? '';
      debugProps.REACT_GLOBAL_STATE_HOOK_DEBUG?.(this, args, hookStack);
    }

    const isExtensionClass = this.constructor !== GlobalStore;
    if (isExtensionClass) return;

    (this as GlobalStore<State, Metadata, ActionsConfig>).initialize();
  }

  /**
   * This method is meant to be overridden by the extended classes
   */
  protected onInit?: () => void | CleanupFunction;

  /**
   * This method is meant to be overridden by the extended classes
   */
  protected onStateChanged?: (args: StateChanges<State>) => void;

  /**
   * @description
   * Initializes the global store, setting up the main hook and actions map if applicable,
   */
  protected async initialize() {
    // actions should be created first than the main hook and the configuration callback param
    // because both depend on the actions map being created
    const storeAndActions =
      this.__devtools_initialize_getStoreActionsMapWrapped?.() ?? this.getStoreActionsMap();

    const { actions, storeTools } = storeAndActions;

    this.actions = actions;
    this.storeTools = storeTools;

    this.use = this.getMainHook();

    // this method could be overridden by extended classes
    const extensionCleanup = this.onInit?.() ?? null;
    if (isFunction(extensionCleanup)) this.cleanupFunctions.push(extensionCleanup);

    const { onInit: onInitFromConfig } = this.callbacks ?? {};
    if (!onInitFromConfig) return;

    const onInitFromConfigStoreTools =
      this.__devtools_getLifeCycleStoreToolsWrapper?.('config/onInit/') ?? storeTools;

    const configCleanup = onInitFromConfig?.(onInitFromConfigStoreTools) ?? null;
    if (isFunction(configCleanup)) this.cleanupFunctions.push(configCleanup);
  }

  /**
   * set the state for a single subscriber
   * validate if the state should be updated by comparing the previous state and the new state
   */
  protected executeSetStateForSubscriber(
    subscription: SubscriberParameters,
    args: {
      forceUpdate: boolean | undefined;
      newState: State;
      currentState: State;
      identifier: string | undefined;
    },
  ): {
    didUpdate: boolean;
  } {
    const {
      selector,
      onStoreChange: callback,
      currentState: currentChildState,
      isEqualRoot = (a, b) => a === b,
      isEqual = (a, b) => a === b,
    } = subscription;

    // compare the root state, there should not be a re-render if the root state is the same
    if (!args.forceUpdate && isEqualRoot(args.currentState, args.newState)) {
      return { didUpdate: false };
    }

    const newChildState = selector ? selector(args.newState) : args.newState;

    // compare the state of the selected part of the state, there should not be a re-render if the state is the same
    if (!args.forceUpdate && isEqual(currentChildState, newChildState)) {
      return { didUpdate: false };
    }

    // update the current state of the subscription
    this.partialUpdateSubscription(subscription, {
      currentState: newChildState,
    });

    // execute the callback associated with the subscription
    // the callback could be an observer event or a sync callback from useSyncExternalStore
    callback(
      {
        state: newChildState,
      },
      {
        identifier: args.identifier,
      },
    );

    return { didUpdate: true };
  }

  /**
   * set the state and update all the subscribers
   * @param {State} newState - The new state to set
   * @param {object} options - The options for setting the state
   * @param {boolean} [options.forceUpdate] - Whether to force the update even if the state is the same
   * @param {string} [options.identifier] - An optional identifier for the state change
   * */
  public setActualStateWithoutValidations(
    newState: State,
    { forceUpdate, identifier }: { forceUpdate?: boolean; identifier?: string },
  ): void {
    const currentState = this.state;

    const shouldUpdate = forceUpdate || currentState !== newState;
    if (!shouldUpdate) return;

    this.state = newState;

    const subscribers = this.subscribers.values();

    const args = {
      forceUpdate,
      newState,
      currentState,
      identifier,
    };

    for (const subscription of subscribers) {
      this.executeSetStateForSubscriber(subscription, args);
    }
  }

  /**
   * Set the value of the metadata property, this is no reactive and will not trigger a re-render
   * @param {MetadataSetter<Metadata>} setter - The setter function or the value to set
   * */
  public setMetadata(setter: Parameters<MetadataSetter<Metadata>>[0]) {
    const metadata = isFunction(setter) ? setter(this.metadata) : setter;

    this.metadata = metadata;
  }

  /**
   * Returns the metadata [non-reactive additional information associated with the global state]
   */
  public getMetadata() {
    return this.metadata;
  }

  /**
   * Get the current value of the state
   */
  public getState() {
    return this.state;
  }

  /**
   * Subscribe an individual callback to state changes
   */
  public subscribe<TDerivate>(
    ...[param1, param2, param3]: [
      SubscribeCallback<State> | SelectorCallback<State, TDerivate>,
      (SubscribeCallbackConfig<State> | SubscribeCallback<TDerivate>)?,
      SubscribeCallbackConfig<State | TDerivate>?,
    ]
  ): UnsubscribeCallback {
    const hasExplicitSelector = isFunction(param2);

    const selector = hasExplicitSelector ? (param1 as SelectorCallback<unknown, unknown>) : undefined;
    const callback = (hasExplicitSelector ? param2 : param1) as SubscribeCallback<unknown>;
    const options = (hasExplicitSelector ? param3 : param2) ?? undefined;

    const initialState = selector ? selector(this.state) : this.state;

    if (!options?.skipFirst) {
      callback(initialState);
    }

    const subscription: SubscriberParameters = {
      selector,
      currentState: initialState,
      onStoreChange: ({ state }: { state: unknown }) => callback(state),
      ...options,
    };

    this.subscribeCallback(subscription);

    return () => {
      this.subscribers.delete(subscription);
    };
  }

  /**
   * Adds a subscription object to the subscribers set and returns the unsubscribe function
   */
  protected subscribeCallback(subscription: SubscriberParameters) {
    this.callbacks?.onSubscribed?.(this.storeTools, subscription);

    this.subscribers.add(subscription);

    return () => {
      this.subscribers.delete(subscription);
    };
  }

  public partialUpdateSubscription(
    subscription: SubscriberParameters,
    values: Partial<SubscriberParameters>,
  ): void {
    Object.assign(subscription, values);
  }

  /**
   * Returns a custom hook that allows to handle a global state
   * @returns {[State, StateMutator, Metadata]} - The state, the state setter or the actions map, the metadata
   * */
  public getMainHook() {
    const identifier = `globalHook:${this._name}`;

    const use = ((
      selector?: <Selection>(state: State) => Selection,
      args: UseHookOptions<unknown, State> | unknown[] = [],
    ) => {
      useDebugValue(identifier);

      const options = isArray(args) ? { dependencies: args } : (args ?? {});

      const subscriptionRef = useRef<SubscriberParameters>(null!);

      const selectorWrapper = (state: State) => {
        return isFunction(selector) ? selector(state) : state;
      };

      // builds the subscription object or retrieves the existing one
      subscriptionRef.current = ((): SubscriberParameters => {
        if (subscriptionRef.current) return subscriptionRef.current;

        return {
          selector: selectorWrapper,
          currentState: selectorWrapper(this.state),
          onStoreChange: () => {
            throw new Error('Callback not set');
          },
          ...options,
        };
      })();

      const currentDependencies = subscriptionRef.current.dependencies;
      const newDependencies = options?.dependencies;

      const extensions: UseHookOptions<unknown> & {
        selector: (state: State) => unknown;
        dependencies: unknown[] | undefined;
      } = {
        ...options,
        selector: selectorWrapper,
        dependencies: newDependencies,
      };

      // keep the hook props updated
      this.partialUpdateSubscription(subscriptionRef.current, extensions);

      const { subscribe, getSnapshot, getServerSnapshot } = useMemo(() => {
        const subscribe = (onStoreChange: () => void) => {
          subscriptionRef.current.onStoreChange = onStoreChange;

          return this.subscribeCallback(subscriptionRef.current);
        };

        const getSnapshot = () => {
          return subscriptionRef.current.currentState;
        };

        const getServerSnapshot = getSnapshot;

        return { subscribe, getSnapshot, getServerSnapshot };
      }, []);

      // could partially update the state if the dependencies changed
      // this helps us to prevent unnecessary re-renders the next time the hook is used
      this.reselectIfDependenciesChanged({
        subscription: subscriptionRef.current,
        newDependencies,
        currentDependencies,
      });

      return [
        useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot),
        this.getStateOrchestrator(),
        this.metadata,
      ];
    }) as unknown as StateHook<State, PublicStateMutator, Metadata>;

    // inherit extensions, they should remain the same as the root store
    const apiAsReadOnly = this as ReadonlyStateApi<unknown, unknown, BaseMetadata>;
    const getMetadata = this.getMetadata.bind(this);

    const useExtensions: StateApi<State, PublicStateMutator, Metadata> = {
      actions: this.actions,
      createObservable: this.createObservable.bind(apiAsReadOnly) as typeof use.createObservable,
      createSelectorHook: this.createSelectorHook.bind(apiAsReadOnly) as typeof use.createSelectorHook,
      dispose: this.dispose.bind(this),

      // this is an special placeholder prop that should be defined with defineProperty below
      metadata: undefined as unknown as Metadata,
      getMetadata,

      getState: this.getState.bind(this),
      reset: this.reset.bind(this),
      setMetadata: this.setMetadata.bind(this),
      setState: this.setState.bind(this),
      subscribe: this.subscribe.bind(this),

      // useful for debugging purposes
      subscribers: this.subscribers,

      // sugar syntax
      use,
      select: ((...args: Parameters<typeof use>) => use(...args)[0]) as SelectHook<State>,
    };

    Object.assign(use, useExtensions);

    // `metadata` is a live, read-only getter (not copied via Object.assign, which would snapshot it).
    // Reads always reflect the current value; use `setMetadata` to change it.
    Object.defineProperty(use, 'metadata', {
      configurable: true,
      enumerable: true,
      get: getMetadata,
    });

    return use;
  }

  protected reselectIfDependenciesChanged({
    subscription,
    newDependencies,
    currentDependencies,
  }: {
    subscription: SubscriberParameters;
    newDependencies: unknown[] | undefined;
    currentDependencies: unknown[] | undefined;
  }): void {
    if (!subscription.selector) return;

    // if the dependencies are the same we don't need to compute the state
    if (currentDependencies === newDependencies) return;

    const isLengthEqual = currentDependencies?.length === newDependencies?.length;
    const isSameValues = isLengthEqual && shallowCompare(currentDependencies, newDependencies);

    // if values are the same we don't need to compute the state
    if (isSameValues) return;

    // update the current state without re-rendering the component
    this.partialUpdateSubscription(subscription, {
      currentState: subscription.selector(this.state),
    });
  }

  public createSelectorHook = createSelectorHook;

  public createObservable = createObservable;

  /**
   * Returns the state setter or the actions map
   * @returns {StateMutator} - The state setter or the actions map
   * */
  protected getStateOrchestrator(): PublicStateMutator {
    return (() => {
      if (this.actions) {
        return this.actions;
      }

      return this.setState.bind(this);
    })() as PublicStateMutator;
  }

  /**
   * This is the only setState function that should be exposed outside the class
   * This is responsible for defining whenever or not the state change should be allowed or prevented
   * the function also execute the functions:
   * - onStateChanged (if defined) - this function is executed after the state change
   * - computePreventStateChange (if defined) - this function is executed before the state change and it should return a boolean value that will be used to determine if the state change should be prevented or not
   */
  public setState(
    setter: Parameters<React.Dispatch<React.SetStateAction<State>>>[0],
    {
      forceUpdate,
      identifier,
    }: {
      forceUpdate?: boolean;
      identifier?: string;
    } = {},
  ) {
    const previousState = this.state;

    const newState = isFunction(setter) ? (setter as (state: State) => State)(previousState) : setter;

    // if the state didn't change, we don't need to do anything
    if (!forceUpdate && this.state === newState) return;

    const setState = this.setActualStateWithoutValidations as React.Dispatch<React.SetStateAction<State>>;

    const stateChanges: StateChanges<State> = {
      previousState,
      state: newState,
      identifier,
    };

    const storeTools = {
      ...this.storeTools,
      ...stateChanges,
      setState,
    };

    // spreading `this.storeTools` snapshots the `metadata` getter into a static value,
    // so restore it as a live getter for callbacks that read metadata during a state change.
    Object.defineProperty(storeTools, 'metadata', {
      configurable: true,
      enumerable: true,
      get: storeTools.getMetadata,
    });

    if (this.callbacks?.computePreventStateChange) {
      const shouldPreventStateChange = this.callbacks?.computePreventStateChange?.(storeTools);
      if (shouldPreventStateChange) return;
    }

    this.setActualStateWithoutValidations(newState, { forceUpdate, identifier });

    this.onStateChanged?.(storeTools);
    this.callbacks?.onStateChanged?.(storeTools);
  }

  /**
   * This creates storeTools and actions map if applicable
   * */
  public getStoreActionsMap(): {
    actions: PublicStateMutator extends AnyFunction ? null : PublicStateMutator;
    storeTools: StoreTools<State, PublicStateMutator, Metadata>;
  } {
    const getMetadata = this.getMetadata.bind(this);

    // passes the same object to all the actions
    const storeTools: typeof this.storeTools = {
      setMetadata: this.setMetadata.bind(this),
      get metadata() {
        return getMetadata();
      },
      getMetadata,
      getState: this.getState.bind(this),
      setState: this.setState.bind(this),
      subscribe: this.subscribe.bind(this),
      actions: null as (typeof this.storeTools)['actions'],
    };

    if (!isRecord(this.actionsConfig)) {
      return {
        actions: null as typeof this.actions,
        storeTools,
      };
    }

    const actionsConfig = this.actionsConfig;
    const actions = {} as NonNullable<typeof storeTools.actions>;

    storeTools.actions = actions;

    const actionsKeys = Object.keys(actionsConfig);

    // we bind the functions to the actions object to allow reusing actions in the same api config by using the -this- keyword
    for (const action_key of actionsKeys) {
      Object.assign(actions, {
        [action_key](...parameters: unknown[]) {
          const actionConfig = actionsConfig[action_key] as (
            ...args: unknown[]
          ) => (...args: unknown[]) => unknown;

          const action = actionConfig.apply(actions, parameters);
          const actionIsNotAFunction = typeof action !== 'function';

          // we throw an error if the action is not a function, this is mandatory for the correct execution of the actions
          if (actionIsNotAFunction) {
            throwWrongKeyOnActionCollectionConfig(action_key);
          }

          // executes the actions bringing access to the state setter and a copy of the state
          const result = action.call(actions, storeTools);

          // we return the result of the actions to the invoker
          return result;
        },
      });
    }

    return {
      actions,
      storeTools,
    };
  }

  protected removeSubscriptions() {
    this.subscribers.clear();
  }

  protected executeCleanupTasks() {
    this.cleanupFunctions.forEach((cleanup) => {
      cleanup?.();
    });

    this.cleanupFunctions.length = 0;
  }

  public dispose() {
    // clean up all the references while keep the structure helps the garbage collector
    this.removeSubscriptions();
    this.executeCleanupTasks();
  }

  public reset(): void;

  public reset(state: State, metadata: Metadata): void;

  /**
   * @description Resets the store to a new initial state and re-runs initialization.
   *
   * This method is reserved for advanced use cases and testing scenarios, use with caution.
   */
  public reset(...args: [State?, Metadata?]): void {
    // execute cleanup functions
    this.executeCleanupTasks();

    const hasArgs = args.length > 0;

    const state = ((): State => {
      if (hasArgs) return args[0] as State;
      if (this.stateCallback) return this.stateCallback();

      return this.state;
    })();

    const metadata = ((): Metadata => {
      if (hasArgs) return args[1] as Metadata;
      if (this.metadataCallback) return this.metadataCallback();

      return this.metadata;
    })();

    // reset state and metadata
    this.setActualStateWithoutValidations(state, { forceUpdate: true });
    this.setMetadata(metadata);

    // this method could be overridden by extended classes
    const extensionCleanup = this.onInit?.() ?? null;
    if (isFunction(extensionCleanup)) this.cleanupFunctions.push(extensionCleanup);

    const { onInit: onInitFromConfig } = this.callbacks ?? {};
    if (!onInitFromConfig) return;

    const onInitFromConfigStoreTools =
      this.__devtools_getLifeCycleStoreToolsWrapper?.('config/onInit/') ?? this.storeTools;

    const configCleanup = onInitFromConfig?.(onInitFromConfigStoreTools) ?? null;
    if (isFunction(configCleanup)) this.cleanupFunctions.push(configCleanup);
  }

  //#region DevTools extensions

  declare __devtools_getLifeCycleStoreToolsWrapper?: (
    logsPrefix: string,
  ) => StoreTools<State, PublicStateMutator, Metadata>;

  declare __devtools_initialize_getStoreActionsMapWrapped?: () => {
    actions: PublicStateMutator extends AnyFunction ? null : PublicStateMutator;
    storeTools: StoreTools<State, PublicStateMutator, Metadata>;
  };

  //#endregion DevTools extensions
}

export function createObservable<RootState, PublicStateMutator, Metadata extends BaseMetadata, Selected>(
  this: Pick<ReadonlyStateApi<RootState, PublicStateMutator, Metadata>, 'getState' | 'subscribe'>,
  selector: (state: RootState) => Selected,
  options?: {
    isEqual?: (current: Selected, next: Selected) => boolean;
    isEqualRoot?: (current: RootState, next: RootState) => boolean;
    name?: string;
  },
): ObservableFragment<Selected, PublicStateMutator, Metadata> {
  const selectorName = options?.name;
  const mainIsEqualRoot = options?.isEqualRoot;
  const mainIsEqual = options?.isEqual;

  let rootState = this.getState();
  let selectedState = (selector ?? ((s) => s))(rootState);

  const childStore = new GlobalStore(selectedState, {
    name: selectorName ?? uniqueId('sh:'),
  });

  // keeps the root state and the derivate state in sync
  const unsubscribeFromRootState = this.subscribe(
    (newRoot) => {
      const isRootEqual = (mainIsEqualRoot ?? Object.is)(rootState, newRoot);

      if (isRootEqual) return;

      rootState = newRoot;

      const selectedState$ = selector(newRoot);
      const isSelectedValueEqual = (mainIsEqual ?? Object.is)(selectedState, selectedState$);

      if (isSelectedValueEqual) return;

      selectedState = selectedState$;

      childStore.setState(selectedState$);
    },
    { skipFirst: true },
  );

  const observable = childStore.subscribe.bind(childStore) as ObservableFragment<
    Selected,
    PublicStateMutator,
    Metadata
  >;

  const extensions: ReadonlyStateApi<unknown, PublicStateMutator, BaseMetadata> = {
    getState: childStore.getState.bind(childStore),
    subscribe: childStore.subscribe.bind(childStore),
    createSelectorHook: createSelectorHook.bind(observable) as typeof extensions.createSelectorHook,
    createObservable: createObservable.bind(observable) as typeof extensions.createObservable,
    dispose: () => {
      unsubscribeFromRootState();
      childStore.dispose();
    },
    subscribers: childStore.subscribers,
  };

  Object.assign(observable, extensions);

  return observable as ObservableFragment<Selected, PublicStateMutator, Metadata>;
}

/**
 * @description
 * Creates a derived hook bound to a selected fragment of the root state.
 * The derived hook re-renders only when the selected value changes and
 * exposes the same API as the parent state hook.
 */
export function createSelectorHook<RootState, PublicStateMutator, Metadata extends BaseMetadata, Selected>(
  this: Pick<ReadonlyStateApi<RootState, PublicStateMutator, Metadata>, 'getState' | 'subscribe'>,
  selector: (state: RootState) => Selected,
  options?: {
    isEqual?: (current: Selected, next: Selected) => boolean;
    isEqualRoot?: (current: RootState, next: RootState) => boolean;
    name?: string;
  },
): ReadonlyHook<Selected, PublicStateMutator, Metadata> {
  const selectorName = options?.name;
  const mainIsEqualRoot = options?.isEqualRoot;
  const mainIsEqual = options?.isEqual;

  let rootState = this.getState();
  let selectedState = (selector ?? ((s) => s))(rootState);

  const derivedStore = new GlobalStore(selectedState, {
    name: selectorName ?? uniqueId('sh:'),
  });

  // keeps the root state and the derivate state in sync
  const unsubscribeFromRootState = this.subscribe(
    (newRoot) => {
      const isRootEqual = (mainIsEqualRoot ?? Object.is)(rootState, newRoot);

      if (isRootEqual) return;

      rootState = newRoot;

      const selectedState$ = selector(newRoot);
      const isSelectedValueEqual = (mainIsEqual ?? Object.is)(selectedState, selectedState$);

      if (isSelectedValueEqual) return;

      selectedState = selectedState$;

      derivedStore.setState(selectedState$);
    },
    { skipFirst: true },
  );

  const selectorHook = ((...args: Parameters<typeof derivedStore.use>) => {
    const [selection] = derivedStore.use(...args);

    return selection;
  }) as ReadonlyHook<Selected, PublicStateMutator, Metadata>;

  const extensions: ReadonlyStateApi<Selected, PublicStateMutator, Metadata> = {
    getState: () => derivedStore.getState(),
    subscribe: derivedStore.subscribe.bind(derivedStore),

    createSelectorHook: createSelectorHook.bind(
      selectorHook as ReadonlyStateApi<unknown, unknown, BaseMetadata>,
    ) as typeof extensions.createSelectorHook,

    createObservable: createObservable.bind(
      selectorHook as ReadonlyStateApi<unknown, unknown, BaseMetadata>,
    ) as typeof extensions.createObservable,

    dispose: () => {
      unsubscribeFromRootState();
      derivedStore.dispose();
    },

    subscribers: derivedStore.subscribers,
  };

  Object.assign(selectorHook, extensions);

  return selectorHook;
}

export default GlobalStore;
