import GlobalStore from './GlobalStore';
import type {
  ActionCollectionResult,
  Any,
  AnyFunction,
  DerivedActionsBuilder,
  DerivedActionsConfig,
  StoreTools,
} from './types';

/**
 * Creates a reusable action template builder.
 *
 * @example
 * const makeUserActions = actions<API>()({
 *   syncUser(id) {
 *     return (store) => {...}
 *   }
 * });
 *
 * const { syncUser } = makeUserActions(api);
 */
export function actions<Api extends StoreTools<Any, Any, Any>>(): DerivedActionsBuilder<Api>;

/**
 * Creates and action group from a config and binds it the provided store
 *
 * @example
 * const userActions = actions(api, {
 *   syncUser(id) {
 *     return (store) => {...}
 *   }
 * });
 *
 * const { syncUser } = userActions;
 */
export function actions<Api extends StoreTools<Any, Any, Any>, Actions extends DerivedActionsConfig<Api>>(
  api: Api,
  actions: Actions,
): {
  [key in keyof Actions]: {
    (...params: Parameters<Actions[key]>): ReturnType<ReturnType<Actions[key]>>;
  };
};

// Implementation
export function actions<Api extends StoreTools<Any, Any, Any>, Actions extends DerivedActionsConfig<Api>>(
  api?: Api,
  actions?: Actions,
):
  | DerivedActionsBuilder<Api>
  | ActionCollectionResult<ReturnType<Api['getState']>, ReturnType<Api['getMetadata']>, Actions> {
  type State = ReturnType<Api['getState']>;
  type Metadata = ReturnType<Api['getMetadata']>;

  // will use GlobalStore with .call to bind actions to store
  const getStoreActionsMap = (api$: Api, actions$: Actions) => {
    const newApi: StoreTools<unknown> & {
      actionsConfig: Actions;
    } = {
      // prevents overriding api context
      setMetadata: (...args) => api$.setMetadata(...args),
      get metadata() {
        return api$.getMetadata();
      },
      getMetadata: () => api$.getMetadata(),
      getState: () => api$.getState(),
      setState: (...args) => api$.setState(...args),
      subscribe: (...args: unknown[]) => (api$.subscribe as AnyFunction)(...args),
      actionsConfig: actions$,
      actions: null,
    };

    const { storeTools, actions: newActions } = GlobalStore.prototype.getStoreActionsMap.call(newApi);

    // Restore parent actions in storeTools so they're available to the new actions
    storeTools.actions = api$.actions;

    return newActions as ActionCollectionResult<State, Metadata, Actions>;
  };

  if (api && actions) {
    return getStoreActionsMap(api, actions);
  }

  return ((actions$: Actions) => {
    return (api$: Api) => getStoreActionsMap(api$, actions$);
  }) as DerivedActionsBuilder<Api>;
}

export default actions;
