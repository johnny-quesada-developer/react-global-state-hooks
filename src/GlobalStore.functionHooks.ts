import { LocalStorageConfig } from './GlobalStore.types';

import { GlobalStore } from './GlobalStore';

import {
  ActionCollectionConfig,
  ActionCollectionResult,
  BaseMetadata,
  CustomGlobalHookBuilderParams,
  MetadataSetter,
  StateChanges,
  StateGetter,
  StateHook,
  StateSetter,
  StoreTools,
} from 'react-hooks-global-states';

/**
 * Creates a global hook that can be used to access the state and actions across the application
 * @returns {} - () => [TState, Setter, TMetadata] the hook that can be used to access the state and the setter of the state
 */
interface CreateGlobalState {
  createGlobalState<State>(
    state: State
  ): StateHook<State, StateSetter<State>, BaseMetadata>;

  createGlobalState<
    State,
    Metadata extends BaseMetadata,
    ActionsConfig extends
      | ActionCollectionConfig<State, Metadata>
      | {}
      | null = null,
    StoreAPI = {
      setMetadata: MetadataSetter<Metadata>;
      setState: StateSetter<State>;
      getState: StateGetter<State>;
      getMetadata: () => Metadata;
      actions: ActionsConfig extends null
        ? null
        : Record<string, (...args: any[]) => void>;
    }
  >(
    state: State,
    config: Readonly<
      {
        /**
         * @deprecated We needed to move the actions parameter as a third argument to fix several issues with the type inference of the actions
         */
        actions?: ActionsConfig;

        /**
         * Non reactive information about the state
         */
        metadata?: Metadata;

        /**
         * executes immediately after the store is created
         * */
        onInit?: (args: StoreAPI) => void;

        onStateChanged?: (args: StoreAPI & StateChanges<State>) => void;
        onSubscribed?: (args: StoreAPI) => void;

        /**
         * callback function called every time the state is about to change and it allows you to prevent the state change
         */
        computePreventStateChange?: (
          args: StoreAPI & StateChanges<State>
        ) => boolean;
      } & LocalStorageConfig
    >
  ): StateHook<
    State,
    ActionsConfig extends null
      ? StateSetter<State>
      : ActionCollectionResult<State, Metadata, ActionsConfig>,
    Metadata
  >;

  createGlobalState<
    State,
    Metadata extends BaseMetadata,
    ActionsConfig extends ActionCollectionConfig<State, Metadata>,
    StoreAPI = {
      setMetadata: MetadataSetter<Metadata>;
      setState: StateSetter<State>;
      getState: StateGetter<State>;
      getMetadata: () => Metadata;
      actions: Record<string, (...args: any[]) => void>;
    }
  >(
    state: State,
    config: Readonly<
      {
        /**
         * Non reactive information about the state
         */
        metadata?: Metadata;

        /**
         * executes immediately after the store is created
         * */
        onInit?: (args: StoreAPI) => void;

        onStateChanged?: (args: StoreAPI & StateChanges<State>) => void;
        onSubscribed?: (args: StoreAPI) => void;

        /**
         * callback function called every time the state is about to change and it allows you to prevent the state change
         */
        computePreventStateChange?: (
          args: StoreAPI & StateChanges<State>
        ) => boolean;
      } & LocalStorageConfig
    >,
    actions: ActionsConfig
  ): StateHook<
    State,
    ActionCollectionResult<State, Metadata, ActionsConfig>,
    Metadata
  >;

  createGlobalState<
    State,
    Metadata extends BaseMetadata,
    ActionsConfig extends ActionCollectionConfig<State, Metadata>,
    StoreAPI = {
      setMetadata: MetadataSetter<Metadata>;
      setState: StateSetter<State>;
      getState: StateGetter<State>;
      getMetadata: () => Metadata;
    }
  >(
    state: State,
    builder: () => ActionsConfig,
    config?: Readonly<
      {
        /**
         * Non reactive information about the state
         */
        metadata?: Metadata;

        /**
         * executes immediately after the store is created
         * */
        onInit?: (args: StoreAPI) => void;

        onStateChanged?: (args: StoreAPI & StateChanges<State>) => void;
        onSubscribed?: (args: StoreAPI) => void;

        /**
         * callback function called every time the state is about to change and it allows you to prevent the state change
         */
        computePreventStateChange?: (
          args: StoreAPI & StateChanges<State>
        ) => boolean;
      } & LocalStorageConfig
    >
  ): StateHook<
    State,
    ActionCollectionResult<State, Metadata, ActionsConfig>,
    Metadata
  >;
}

/**
 * Creates a global hook that can be used to access the state and actions across the application
 * @returns {} - () => [TState, Setter, TMetadata] the hook that can be used to access the state and the setter of the state
 */
export const createGlobalState = ((state, ...args) => {
  const isBuilderFunction = typeof args[0] === 'function';

  const { config, actions } = (() => {
    if (isBuilderFunction) {
      const builder = args[0];
      const config = args[1];
      const actions = builder();

      return { config, actions };
    }

    const config = args[0];
    const actions = args[1] ?? config?.actions;

    return { config, actions };
  })();

  return new GlobalStore(state, config, actions).getHook();
}) as CreateGlobalState['createGlobalState'];

/**
 * @description
 * Use this function to create a custom global store.
 * You can use this function to create a store with async storage.
 */
export const createCustomGlobalState = <
  InheritMetadata extends BaseMetadata,
  CustomConfig extends Record<string, any>
>({
  onInitialize,
  onChange,
}: CustomGlobalHookBuilderParams<InheritMetadata, CustomConfig>) => {
  /**
   * @description
   * Use this function to create a custom global store.
   * You can use this function to create a store with async storage or any other custom logic.
   * @param state The initial state of the store.
   * @param config The configuration of the store.
   * @returns [HOOK, DECOUPLED_RETRIEVER, DECOUPLED_MUTATOR] - this is an array with the hook, the decoupled stateRetriever function and the decoupled stateMutator of the state
   */
  return <
    State,
    Metadata extends BaseMetadata = InheritMetadata,
    ActionsConfig extends Readonly<
      ActionCollectionConfig<State, Metadata & InheritMetadata>
    > | null = null
  >(
    state: State,
    _config?: Readonly<{
      metadata?: Metadata & InheritMetadata;

      readonly actions?: Readonly<ActionsConfig>;

      onInit?: (args: StoreTools<State, Metadata & InheritMetadata>) => void;

      onStateChanged?: (
        args: StoreTools<State, Metadata & InheritMetadata> &
          StateChanges<State>
      ) => void;

      onSubscribed?: (
        parameters: StoreTools<State, Metadata & InheritMetadata>
      ) => void;

      computePreventStateChange?: (
        args: StoreTools<State, Metadata & InheritMetadata> &
          StateChanges<State>
      ) => boolean;

      /**
       * @description
       * Type of the configuration object that the custom hook will require or accept
       */
      config?: CustomConfig;
    }>
  ) => {
    const {
      onInit,
      onStateChanged,
      config: customConfig,
      ...parameters
    } = _config ?? {};

    const onInitWrapper = ((callBackParameters) => {
      onInitialize(
        callBackParameters as unknown as StoreTools<
          any,
          InheritMetadata,
          Record<string, (...args: any[]) => void>
        >,
        customConfig
      );

      onInit?.(callBackParameters);
    }) as typeof onInit;

    const onStateChangeWrapper = ((callBackParameters) => {
      onChange(
        callBackParameters as StoreTools<
          any,
          InheritMetadata,
          Record<string, (...args: any[]) => void>
        > &
          StateChanges<any>,
        customConfig
      );

      onStateChanged?.(callBackParameters);
    }) as typeof onStateChanged;

    return createGlobalState(state, {
      onInit: onInitWrapper,
      onStateChanged: onStateChangeWrapper,
      ...parameters,
    });
  };
};

/**
 * @description
 * Use this function to create a custom global store.
 * You can use this function to create a store with async storage.
 * @deprecated
 */
export const createCustomGlobalStateWithDecoupledFuncs =
  createCustomGlobalState as typeof createCustomGlobalState;
