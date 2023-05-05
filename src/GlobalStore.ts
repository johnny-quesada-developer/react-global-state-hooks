import { GlobalStoreConfig } from './GlobalStore.types';
import { getLocalStorageItem, setLocalStorageItem } from './GlobalStore.utils';

import ReactDOM from 'react-dom';

import {
  ActionCollectionConfig,
  GlobalStoreAbstract,
  SetStateCallback,
  shallowCompare,
  StateChangesParam,
  StateConfigCallbackParam,
  StateSetter,
  SubscriberParameters,
  SubscriptionCallback,
} from 'react-native-global-state-hooks';

export class GlobalStore<
  TState,
  TMetadata = null,
  TStateSetter extends
    | ActionCollectionConfig<TState, TMetadata>
    | StateSetter<TState> = StateSetter<TState>
> extends GlobalStoreAbstract<TState, TMetadata, NonNullable<TStateSetter>> {
  protected config: GlobalStoreConfig<TState, TMetadata, TStateSetter>;

  constructor(
    state: TState,
    config: GlobalStoreConfig<TState, TMetadata, TStateSetter> = {},
    actionsConfig: TStateSetter | null = null
  ) {
    super(state, config, actionsConfig);

    this.initialize();
  }

  protected onInitialize = ({
    setState,
    getState,
  }: StateConfigCallbackParam<TState, TMetadata>) => {
    const localStorageKey = this.config?.localStorage?.key;

    if (!localStorageKey) return;

    const restored = getLocalStorageItem<TState>({
      localStorageKey,
      config: this.config,
    });

    if (restored === null) {
      const state = getState();

      setLocalStorageItem({
        item: state,
        localStorageKey,
        config: this.config,
      });

      return;
    }

    setState(restored);
  };

  protected onChange = ({
    getState,
  }: StateChangesParam<TState, TMetadata, NonNullable<TStateSetter>>) => {
    const localStorageKey = this.config?.localStorage?.key;

    setLocalStorageItem({
      item: getState(),
      localStorageKey,
      config: this.config,
    });
  };

  /**
   * set the state and update all the subscribers
   * @param {StateSetter<TState>} setter - The setter function or the value to set
   * @param {SetStateCallback} invokerSetState - The setState function of the component that invoked the state change (optional) (default: null) this is used to updated first the component that invoked the state change
   * */
  protected setState = ({
    invokerSetState,
    state,
    forceUpdate,
  }: {
    state: TState;
    invokerSetState?: SetStateCallback;
    forceUpdate: boolean;
  }) => {
    // update the main state
    this.stateWrapper = {
      state,
    };

    const unstable_batchedUpdates =
      ReactDOM.unstable_batchedUpdates ||
      ((callback: () => void) => callback());

    unstable_batchedUpdates(() => {
      const executeSetState = (
        setter: SubscriptionCallback,
        parameters: SubscriberParameters<TState>
      ) => {
        const { selector, currentState, config } = parameters;

        const compareCallback = (() => {
          if (config?.isEqual || config?.isEqual === null) {
            return config?.isEqual;
          }

          if (!selector) return null;

          // shallow compare is added by default to the selectors unless the isEqual property is set
          return shallowCompare;
        })();

        const newState = selector ? selector(state) : state;

        if (!forceUpdate && compareCallback?.(currentState, newState)) return;

        setter({ state: newState });
      };

      if (invokerSetState) {
        const parameters = this.subscribers.get(invokerSetState);

        executeSetState(invokerSetState, parameters);
      }

      // update all the subscribers
      Array.from(this.subscribers.entries()).forEach(
        ([setState, parameters]) => {
          if (setState === invokerSetState) return;

          executeSetState(setState, parameters);
        }
      );
    });
  };
}
