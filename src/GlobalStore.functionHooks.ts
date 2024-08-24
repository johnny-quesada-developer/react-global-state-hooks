import { createStateConfig, CustomGlobalHookParams } from './GlobalStore.types';

import { GlobalStore } from './GlobalStore';

import {
  ActionCollectionConfig,
  ActionCollectionResult,
  AvoidNever,
  CustomGlobalHookBuilderParams,
  StateChangesParam,
  StateConfigCallbackParam,
  StateGetter,
  StateHook,
  StateSetter,
} from 'react-hooks-global-states';

/**
 * Creates a global state with the given state and config.
 * @returns {} [HOOK, DECOUPLED_RETRIEVER, DECOUPLED_MUTATOR] this is an array with the hook, the decoupled getState function and the decoupled setter of the state
 */
export const createGlobalStateWithDecoupledFuncs = <
  TState,
  TMetadata = null,
  TActions extends ActionCollectionConfig<TState, TMetadata> | null = null
>(
  state: TState,
  { actions, ...config }: createStateConfig<TState, TMetadata, TActions> = {}
) => {
  const store = new GlobalStore<TState, TMetadata, TActions>(
    state,
    config,
    actions
  );

  const [stateRetriever, stateMutator] = store.getHookDecoupled();

  type StateMutator = keyof TActions extends never
    ? StateSetter<TState>
    : ActionCollectionResult<TState, TMetadata, TActions>;

  return [store.getHook(), stateRetriever, stateMutator] as [
    hook: StateHook<TState, StateMutator, TMetadata>,
    stateRetriever: StateGetter<TState>,
    stateMutator: StateMutator
  ];
};

/**
 * Creates a global hook that can be used to access the state and actions across the application
 * @returns {} - () => [TState, stateMutator, TMetadata] the hook that can be used to access the state and the stateMutator of the state
 */
export const createGlobalState = <
  TState,
  TMetadata = null,
  TActions extends ActionCollectionConfig<TState, TMetadata> | null = null
>(
  state: TState,
  config: createStateConfig<TState, TMetadata, TActions> = {}
) => {
  const [useState, stateRetriever, stateMutator] =
    createGlobalStateWithDecoupledFuncs<TState, TMetadata, TActions>(
      state,
      config
    );

  type GlobalStateHook = typeof useState & {
    stateControls: () => [
      stateRetriever: typeof stateRetriever,
      stateMutator: typeof stateMutator
    ];
  };

  (useState as unknown as GlobalStateHook).stateControls = () => [
    stateRetriever,
    stateMutator,
  ];

  return useState as GlobalStateHook;
};

/**
 * @description
 * Use this function to create a custom global store.
 * You can use this function to create a store with async storage.
 */
export const createCustomGlobalStateWithDecoupledFuncs = <
  TInheritMetadata = null,
  TCustomConfig = null
>({
  onInitialize,
  onChange,
}: CustomGlobalHookBuilderParams<TInheritMetadata, TCustomConfig>) => {
  /**
   * @description
   * Use this function to create a custom global store.
   * You can use this function to create a store with async storage or any other custom logic.
   * @param state The initial state of the store.
   * @param config The configuration of the store.
   * @returns [HOOK, DECOUPLED_RETRIEVER, DECOUPLED_MUTATOR] - this is an array with the hook, the decoupled stateRetriever function and the decoupled stateMutator of the state
   */
  return <
    TState,
    TMetadata = null,
    TActions extends ActionCollectionConfig<
      TState,
      AvoidNever<TInheritMetadata> & AvoidNever<TMetadata>
    > | null = null
  >(
    state: TState,
    {
      config: customConfig,
      onInit,
      onStateChanged,
      ...parameters
    }: CustomGlobalHookParams<
      TCustomConfig,
      TState,
      AvoidNever<TInheritMetadata> & AvoidNever<TMetadata>,
      TActions
    > = {
      config: null,
    }
  ) => {
    const onInitWrapper = ((callBackParameters) => {
      onInitialize(
        callBackParameters as StateConfigCallbackParam<
          unknown,
          TInheritMetadata
        >,
        customConfig
      );

      onInit?.(callBackParameters);
    }) as typeof onInit;

    const onStateChangeWrapper = ((callBackParameters) => {
      onChange(
        callBackParameters as StateChangesParam<unknown, TInheritMetadata>,
        customConfig
      );

      onStateChanged?.(callBackParameters);
    }) as typeof onStateChanged;

    return createGlobalStateWithDecoupledFuncs<
      TState,
      typeof parameters.metadata,
      TActions
    >(state, {
      onInit: onInitWrapper,
      onStateChanged: onStateChangeWrapper,
      ...parameters,
    });
  };
};
