import { createGlobalState } from './GlobalStore.functionHooks';
import { clone, isDate, isPrimitive } from 'json-storage-formatter';
import React, { PropsWithChildren } from 'react';
import {
  ActionCollectionConfig,
  StateHook,
  StateSetter,
  ActionCollectionResult,
  StateGetter,
  StateChanges,
  StoreTools,
} from 'react-hooks-global-states';

export const createStatefulContext = <
  State,
  Metadata = null,
  ActionsConfig extends
    | ActionCollectionConfig<State, Metadata>
    | null
    | {} = null
>(
  initialValue: State,
  parameters?: Readonly<{
    /**
     * Non reactive data of the store
     * */
    metadata?: Metadata;

    /**
     * actions configuration for restricting the manipulation of the state
     */
    actions?: ActionsConfig;

    onInit?: (storeAPI: StoreTools<State, Metadata>) => void;

    onStateChanged?: (
      storeAPI: StoreTools<State, Metadata> & StateChanges<State>
    ) => void;

    onSubscribed?: (storeAPI: StoreTools<State, Metadata>) => void;

    computePreventStateChange?: (
      storeAPI: StoreTools<State, Metadata>
    ) => boolean;
  }>
) => {
  type PublicStateMutator = ActionsConfig extends null
    ? StateSetter<State>
    : ActionCollectionResult<State, Metadata, ActionsConfig>;

  type ContextHook = [
    hook: StateHook<State, PublicStateMutator, Metadata>,
    stateRetriever: StateGetter<State>,
    stateMutator: PublicStateMutator
  ];

  const context = React.createContext<ContextHook>(null);

  const useHook = () => {
    return React.useContext(context);
  };

  const Provider: React.FC<
    PropsWithChildren<{
      initialValue?: Partial<State>;
    }>
  > = ({ children, ...props }) => {
    const hook = createGlobalState<State, Metadata, ActionsConfig>(
      (() => {
        if (props.initialValue) {
          const isFunction = typeof props.initialValue === 'function';

          if (isFunction)
            return (props.initialValue as unknown as (state: State) => State)(
              clone(initialValue)
            );

          const isArray = Array.isArray(props.initialValue);
          const isMap = props.initialValue instanceof Map;
          const isSet = props.initialValue instanceof Set;

          const isMergeAble =
            !isPrimitive(props.initialValue) &&
            !isDate(props.initialValue) &&
            !isArray &&
            !isMap &&
            !isSet;

          return (
            isMergeAble
              ? { ...initialValue, ...props.initialValue }
              : props.initialValue
          ) as State;
        }

        // return a copy of the initial value to avoid reference issues
        // this initial value will be reused in all the instances of the hook
        return clone(initialValue);
      })(),
      parameters
    );

    return React.createElement(
      context.Provider,
      { value: hook as any },
      children
    );
  };

  return [useHook, Provider] as const;
};
