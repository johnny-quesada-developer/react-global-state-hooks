import React, {
  type PropsWithChildren,
  createContext as reactCreateContext,
  useContext,
  createElement as reactCreateElement,
  useMemo,
  useEffect,
  useRef,
  useDebugValue,
  useLayoutEffect,
  useState,
} from 'react';

import { createObservable, createSelectorHook as createSelectorHookBase, GlobalStore } from './GlobalStore';

import type {
  StateHook,
  BaseMetadata,
  UseHookOptions,
  SelectorCallback,
  ReadonlyStateApi,
  SelectHook,
  StateApi,
  ContextActionCollectionConfig,
  ContextHook,
  ContextProvider,
  ContextProviderExtensions,
  ContextPublicApi,
  ContextStoreCallbacks,
  ContextStoreTools,
  ContextStoreToolsExtensions,
  CreateContext,
  ReadonlyContextHook,
  ReadonlyContextPublicApi,
} from './types';

import isFunction from 'json-storage-formatter/isFunction';
import uniqueId from './uniqueId';

/**
 * @description Creates a highly granular React context with its associated provider and state hook.
 * Unlike the native `React.createContext`, this version provides fine-grained reactivity and supports
 * state selection, metadata handling, and optional custom actions for controlled mutations.
 *
 * Components using the generated hook only re-render when the selected part of the state changes,
 * making it efficient for large or deeply nested state trees.
 */
export const createContext = ((
  valueArg: unknown | (() => unknown),
  contextArgs: {
    name?: string;
    metadata?: BaseMetadata | (() => BaseMetadata);
    callbacks?: ContextStoreCallbacks<unknown, unknown, BaseMetadata>;
    actions?: ContextActionCollectionConfig<unknown, BaseMetadata>;
  } = {},
) => {
  const Context = reactCreateContext<StateHook<unknown, unknown, BaseMetadata> | null>(null);

  const contextIdentifier = contextArgs.name ?? uniqueId('ctx:');

  type ProviderProps = Parameters<ContextProvider<unknown, unknown, BaseMetadata>>[0];

  // Gets the initial state
  const getInheritedState = () => (isFunction(valueArg) ? valueArg() : valueArg);

  const hasValueProp = (props: ProviderProps): props is { value: unknown } => {
    return Object.prototype.hasOwnProperty.call(props, 'value');
  };

  // this hook is necessary to be able to useDebugValue in the provider
  const useProviderValue = (props: ProviderProps) => {
    useDebugValue(`${contextIdentifier}:Provider`);

    const [store] = useState(() => {
      const initialValue = (() => {
        if (hasValueProp(props))
          return isFunction(props.value) ? props.value(getInheritedState()) : props.value;
        return getInheritedState();
      })();

      const __devtools_metadata = {
        __devtools_isContextStore: true,
      };

      const store = new GlobalStore<unknown, BaseMetadata, unknown, unknown>(initialValue, {
        ...contextArgs,
        metadata: (isFunction(contextArgs.metadata) ? contextArgs.metadata() : contextArgs.metadata) ?? {},
        ...__devtools_metadata,
      });

      const storeToolsExtensions: ContextStoreToolsExtensions<unknown, unknown, BaseMetadata> = {
        use,
      };

      // exposes the main hook as part of the store tools
      Object.assign(store.storeTools, storeToolsExtensions);

      contextArgs.callbacks?.onCreated?.(
        store.storeTools as ContextStoreTools<unknown, unknown, BaseMetadata>,
        store,
      );

      props.onCreated?.(store.storeTools as ContextStoreTools<unknown, unknown, BaseMetadata>, store);

      return store;
    });

    // allows the provider consumer to own the state by passing a value prop
    useLayoutEffect(() => {
      const shouldUpdateState = hasValueProp(props) && !isFunction(props.value);
      if (!shouldUpdateState) return;

      store.setState(props.value);
    }, [store, props.value]);

    // handle mount and unmount lifecycle
    useEffect(() => {
      const unsubscribes = [
        contextArgs.callbacks?.onMounted?.(
          store.storeTools as ContextStoreTools<unknown, unknown, BaseMetadata>,
          store,
        ),

        props.onMounted?.(store.storeTools as ContextStoreTools<unknown, unknown, BaseMetadata>, store),
      ].filter(Boolean);

      return () => {
        store.callbacks?.onUnMount?.(store);
        unsubscribes.forEach((unsubscribe) => unsubscribe?.());

        // Required by the global hooks developer tools
        (store as unknown as { __onUnMountContext: (...args: unknown[]) => unknown }).__onUnMountContext?.(
          store,
        );
      };
    }, [store]);

    props.onRender?.(store.storeTools as ContextStoreTools<unknown, unknown, BaseMetadata>, store);

    return store;
  };

  const Provider: React.FC<ProviderProps> = (args) => {
    const store = useProviderValue(args);

    return reactCreateElement(Context.Provider, { value: store.use }, args.children);
  };

  // setting display names for easier debugging
  // wrapper
  Provider.displayName = `${contextIdentifier}:Provider`;
  // context
  Context.displayName = `${contextIdentifier}`;

  const providerExtensions: ContextProviderExtensions<unknown, unknown, BaseMetadata> = {
    makeProviderWrapper: (parentOptions) => {
      const context = {
        current: undefined,
        instance: undefined,
      } as unknown as ReturnType<typeof providerExtensions.makeProviderWrapper>['context'];

      const wrapper = ({ children, ...options }: PropsWithChildren) => {
        return reactCreateElement(
          Provider,
          {
            ...parentOptions,
            ...options,
            onCreated: (ctx, store) => {
              context.current = ctx;
              context.instance = store;

              parentOptions?.onCreated?.(ctx, store);
            },
          },
          children,
        );
      };

      return { wrapper, context };
    },
  };

  const use = ((...args: Parameters<ContextHook<unknown, unknown, BaseMetadata>>) => {
    useDebugValue(`${contextIdentifier}:use`);

    const hook = useContext(Context);
    if (!hook) throw new Error('use hook must be used within a ContextProvider');

    return hook(...args);
  }) as ContextHook<unknown, unknown, BaseMetadata> & ContextPublicApi<unknown, unknown, BaseMetadata>;

  const api = () => {
    useDebugValue(`${contextIdentifier}:api`);

    const hook = useContext(Context);
    if (!hook) throw new Error('api hook must be used within a ContextProvider');

    // the hook contains the api methods
    // no need to build anything else
    return hook as StateApi<unknown, unknown, BaseMetadata>;
  };

  const observable: ContextPublicApi<unknown, unknown, BaseMetadata>['observable'] = (...args) => {
    useDebugValue(`${contextIdentifier}:observable`);

    const context = api();

    const props = useRef(args);
    props.current = args;

    return useMemo(() => {
      return context.createObservable(
        (state) => {
          const selector = props.current[0];
          return selector(state);
        },
        {
          // we call the equality in this way to execute always the latest version of the functions
          // check if the root state changed
          isEqualRoot: !props.current[1]?.isEqualRoot
            ? undefined
            : (current, next) => {
                const isEqualRoot = props.current[1]!.isEqualRoot!;
                return Boolean(isEqualRoot(current, next));
              },

          // check if the selection changed
          isEqual: !props.current[1]?.isEqual
            ? undefined
            : (current, next) => {
                const isEqual = props.current[1]!.isEqual!;
                return Boolean(isEqual(current, next));
              },

          name: props.current[1]?.name,
        },
      );
    }, [context]);
  };

  const useExtensions: ContextPublicApi<unknown, unknown, BaseMetadata> = {
    displayName: Context.displayName,
    createSelectorHook: createSelectorHook.bind(use) as typeof use.createSelectorHook,
    api,
    select: ((...args: Parameters<typeof use>) => use(...args)[0]) as SelectHook<unknown>,
    observable,
    actions: () => {
      return api().actions as null; // is not necessarily null but we don't care about the types here
    },
  };

  Object.assign(Provider, providerExtensions);
  Object.assign(use, useExtensions);

  return {
    use,
    Provider,
    Context,
  };
}) as CreateContext;

function createSelectorHook(
  this: Pick<ReadonlyContextPublicApi<unknown, unknown, BaseMetadata>, 'api' | 'displayName'>,
  selector: SelectorCallback<unknown, unknown>,
  hookConfig?: UseHookOptions<unknown, unknown> & {
    /**
     * @description Name of the selector for devtools
     */
    name?: string;
  },
): ReadonlyContextHook<unknown, unknown, BaseMetadata> {
  type SelectorArgs = Parameters<
    ReturnType<ContextPublicApi<unknown, unknown, BaseMetadata>['createSelectorHook']>
  >;
  const selectorIdentifier = hookConfig?.name ?? uniqueId('sh:');

  const use = ((...selectorArgs: SelectorArgs) => {
    const context = this.api();

    useDebugValue(`${this.displayName}:selector`);
    useDebugValue(`${selectorIdentifier}:use`);

    return useMemo(() => {
      return context.createSelectorHook(selector, hookConfig);
    }, [context])(...selectorArgs);
  }) as ReadonlyContextHook<unknown, unknown, BaseMetadata>;

  const api = (): ReadonlyStateApi<unknown, unknown, BaseMetadata> => {
    useDebugValue(`${this.displayName}:selector`);
    useDebugValue(`${selectorIdentifier}:api`);

    const context = this.api();

    return useMemo(() => {
      const observable = context.createObservable(selector, hookConfig);

      return {
        ...context,
        getState: () => observable.getState(),
        subscribe: observable.subscribe.bind(observable),
        createSelectorHook: createSelectorHookBase.bind(observable),
        createObservable: createObservable.bind(observable),
      } as ReadonlyStateApi<unknown, unknown, BaseMetadata>;
    }, [context]);
  };

  const publicExtensions: ReadonlyContextPublicApi<unknown, unknown, BaseMetadata> = {
    displayName: this.displayName,
    createSelectorHook: createSelectorHook.bind(use) as typeof use.createSelectorHook,
    api,
  };

  Object.assign(use, publicExtensions);

  return use;
}

export default createContext;

/**
 * Temporary re-export types for backwards compatibility
 */
export type {
  GlobalStoreContextCallbacks,
  GlobalStoreCallbacks,
  ContextActionCollectionResult,
  ContextActionCollectionConfig,
  ContextStoreToolsExtensions,
  ContextStoreTools,
  ContextProviderExtensions,
  ContextProvider,
  ReadonlyContextHook,
  ContextHook,
  ContextPublicApi,
  ReadonlyContextPublicApi,
  CreateContext,
  InferContextApi,
  InferStateApi,
} from './types';
