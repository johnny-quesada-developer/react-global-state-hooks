import {
  ActionCollectionConfig,
  ActionCollectionResult,
  BaseMetadata,
  MetadataSetter,
  StateChanges,
  StateGetter,
  StateHook,
  StateSetter,
  UseHookConfig,
  uniqueId,
} from 'react-hooks-global-states';

import { GlobalStore } from './GlobalStore';

import React, {
  PropsWithChildren,
  useMemo,
  useImperativeHandle,
  useEffect,
} from 'react';
import { LocalStorageConfig } from './GlobalStore.types';

export type ProviderAPI<Value, Metadata> = {
  setMetadata: MetadataSetter<Metadata>;
  setState: StateSetter<Value>;
  getState: StateGetter<Value>;
  getMetadata: () => Metadata;
  actions: Record<string, (...args: any[]) => void>;
};

type Provider<Value, Metadata extends BaseMetadata = BaseMetadata> = React.FC<
  PropsWithChildren<{
    value?: Value | ((initialValue: Value) => Value);
    ref?: React.MutableRefObject<ProviderAPI<Value, Metadata>>;
  }>
>;

type Context<
  Value,
  PublicStateMutator,
  Metadata extends BaseMetadata
> = (() => StateHook<Value, PublicStateMutator, Metadata>) & {
  /**
   * Allows you to create a selector hooks
   * This hooks only works when contained in the scope of the provider
   */
  createSelectorHook: <
    RootState,
    RootSelectorResult,
    RootDerivate = RootSelectorResult extends never
      ? RootState
      : RootSelectorResult
  >(
    this: Context<RootState, PublicStateMutator, Metadata>,
    mainSelector?: (state: Value) => RootSelectorResult,
    {
      isEqualRoot,
      isEqual,
      name,
    }?: Omit<UseHookConfig<RootDerivate, Value>, 'dependencies'> & {
      name?: string;
    }
  ) => StateHook<RootDerivate, PublicStateMutator, Metadata>;
};

export interface CreateContext {
  createContext<Value>(
    state: Value
  ): readonly [
    Context<Value, StateSetter<Value>, BaseMetadata>,
    Provider<Context<Value, StateSetter<Value>, BaseMetadata>>
  ];

  createContext<
    Value,
    Metadata extends BaseMetadata,
    ActionsConfig extends
      | ActionCollectionConfig<Value, Metadata>
      | {}
      | null = null,
    StoreAPI = {
      setMetadata: MetadataSetter<Metadata>;
      setState: StateSetter<Value>;
      getState: StateGetter<Value>;
      getMetadata: () => Metadata;
      actions: ActionsConfig extends null
        ? null
        : Record<string, (...args: any[]) => void>;
    }
  >(
    state: Value,
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

        onStateChanged?: (args: StoreAPI & StateChanges<Value>) => void;
        onSubscribed?: (args: StoreAPI) => void;

        /**
         * callback function called every time the state is about to change and it allows you to prevent the state change
         */
        computePreventStateChange?: (
          args: StoreAPI & StateChanges<Value>
        ) => boolean;

        onUnMount?: () => void;
      } & LocalStorageConfig
    >
  ): readonly [
    Context<
      Value,
      ActionsConfig extends null
        ? StateSetter<Value>
        : ActionCollectionResult<Value, Metadata, ActionsConfig>,
      Metadata
    >,
    Provider<
      Context<
        Value,
        ActionsConfig extends null
          ? StateSetter<Value>
          : ActionCollectionResult<Value, Metadata, ActionsConfig>,
        Metadata
      >,
      Metadata
    >
  ];

  createContext<
    Value,
    Metadata extends BaseMetadata,
    ActionsConfig extends ActionCollectionConfig<Value, Metadata>,
    StoreAPI = {
      setMetadata: MetadataSetter<Metadata>;
      setState: StateSetter<Value>;
      getState: StateGetter<Value>;
      getMetadata: () => Metadata;
      actions: Record<string, (...args: any[]) => void>;
    }
  >(
    state: Value,
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

        onStateChanged?: (args: StoreAPI & StateChanges<Value>) => void;
        onSubscribed?: (args: StoreAPI) => void;

        /**
         * callback function called every time the state is about to change and it allows you to prevent the state change
         */
        computePreventStateChange?: (
          args: StoreAPI & StateChanges<Value>
        ) => boolean;

        onUnMount?: () => void;
      } & LocalStorageConfig
    >,
    actions: ActionsConfig
  ): readonly [
    Context<
      Value,
      ActionCollectionResult<Value, Metadata, ActionsConfig>,
      Metadata
    >,
    Provider<
      Context<
        Value,
        ActionCollectionResult<Value, Metadata, ActionsConfig>,
        Metadata
      >
    >
  ];

  createContext<
    Value,
    Metadata extends BaseMetadata,
    ActionsConfig extends ActionCollectionConfig<Value, Metadata>,
    StoreAPI = {
      setMetadata: MetadataSetter<Metadata>;
      setState: StateSetter<Value>;
      getState: StateGetter<Value>;
      getMetadata: () => Metadata;
    }
  >(
    state: Value,
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

        onStateChanged?: (args: StoreAPI & StateChanges<Value>) => void;
        onSubscribed?: (args: StoreAPI) => void;

        /**
         * callback function called every time the state is about to change and it allows you to prevent the state change
         */
        computePreventStateChange?: (
          args: StoreAPI & StateChanges<Value>
        ) => boolean;

        onUnMount?: () => void;
      } & LocalStorageConfig
    >
  ): readonly [
    Context<
      Value,
      ActionCollectionResult<Value, Metadata, ActionsConfig>,
      Metadata
    >,
    Provider<
      Context<
        Value,
        ActionCollectionResult<Value, Metadata, ActionsConfig>,
        Metadata
      >
    >
  ];
}

export const createContext = ((initialValue, ...args: any[]) => {
  const selectorHooksByParentHook: Map<
    StateHook<any, any, any>,
    Map<string, StateHook<any, any, any>>
  > = new Map();

  const context = React.createContext(null);

  const useContext = () => {
    return React.useContext<StateHook<any, any, any>>(context);
  };

  useContext.createSelectorHook = (...createSelectorHookArgs: []) => {
    const selectorId = uniqueId();

    return (...hookArgs: []) => {
      const currentParentHook = useContext();
      const selectorsMap = selectorHooksByParentHook.get(currentParentHook);

      // one hook per selector and parent hook
      if (!selectorsMap.has(selectorId)) {
        selectorsMap.set(
          selectorId,
          currentParentHook.createSelectorHook(...createSelectorHookArgs)
        );
      }

      const useSelectedHook = selectorsMap.get(selectorId);

      return useSelectedHook(...hookArgs);
    };
  };

  const Provider: Provider<any> = ({ children, value, ref }) => {
    const { store, hook } = useMemo(() => {
      const isBuilderFunction = typeof args[0] === 'function';

      const { config, actionsConfig } = (() => {
        if (isBuilderFunction) {
          const builder = args[0];
          const config = args[1];
          const actionsConfig = builder();

          return { config, actionsConfig };
        }

        const config = args[0];
        const actionsConfig = args[1] ?? config?.actions;

        return { config, actionsConfig };
      })();

      const store = new GlobalStore(
        (() => {
          if (value) {
            if (typeof value === 'function') return value(initialValue);

            return value;
          }

          return initialValue;
        })(),
        config,
        actionsConfig
      );

      return { store, hook: store.getHook() };
    }, []);

    type Store = {
      config: (typeof store)['config'] & {
        onUnMount?: () => void;
      };
      getConfigCallbackParam: (typeof store)['getConfigCallbackParam'];
      __onUnMountContext: (
        store: GlobalStore<any, any, any>,
        hook: StateHook<any, any, any>
      ) => void;
    };

    useImperativeHandle(
      ref,
      () => {
        if (!ref) return {} as ProviderAPI<any, any>;

        return (store as unknown as Store).getConfigCallbackParam();
      },
      [store]
    );

    if (!selectorHooksByParentHook.has(hook)) {
      selectorHooksByParentHook.set(hook, new Map());
    }

    useEffect(() => {
      selectorHooksByParentHook.delete(hook);

      return () => {
        (store as unknown as Store).config?.onUnMount?.();
        (store as unknown as Store).__onUnMountContext?.(store, hook);
      };
    }, []);

    return React.createElement(context.Provider, { value: hook }, children);
  };

  return [useContext, Provider] as const;
}) as unknown as CreateContext['createContext'];
