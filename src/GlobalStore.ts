import { GlobalStoreConfig } from './GlobalStore.types';
import { getLocalStorageItem, setLocalStorageItem } from './GlobalStore.utils';

import {
  ActionCollectionConfig,
  BaseMetadata,
  GlobalStoreAbstract,
  StateChanges,
  StoreTools,
} from 'react-hooks-global-states';

const isLocalStorageAvailable = () => {
  return !!globalThis?.localStorage;
};

export class GlobalStore<
  State,
  Metadata extends BaseMetadata,
  ActionsConfig extends
    | ActionCollectionConfig<State, Metadata>
    | null
    | {} = null
> extends GlobalStoreAbstract<State, Metadata, ActionsConfig> {
  protected config: GlobalStoreConfig<State, Metadata>;

  constructor(
    state: State,
    config?: GlobalStoreConfig<State, Metadata>,
    actionsConfig?: ActionsConfig
  ) {
    super(state, config, actionsConfig);

    const isExtensionClass = this.constructor !== GlobalStore;
    if (isExtensionClass) return;

    (this as GlobalStore<State, Metadata, ActionsConfig>).initialize();
  }

  protected _onInitialize = ({
    setState,
    getState,
  }: StoreTools<State, Metadata>) => {
    // avoid compatibility issues with SSR
    if (!isLocalStorageAvailable()) return;

    const localStorageKey = this.config?.localStorage?.key;

    if (!localStorageKey) return;

    const restored = getLocalStorageItem<State>({
      config: this.config,
    });

    if (restored === null) {
      const state = getState();

      setLocalStorageItem({
        item: state,
        config: this.config,
      });

      return;
    }

    setState(restored);
  };

  protected _onChange = ({
    getState,
  }: StoreTools<State, Metadata> & StateChanges<State>) => {
    // avoid compatibility issues with SSR
    if (!isLocalStorageAvailable()) return;

    setLocalStorageItem({
      item: getState(),
      config: this.config,
    });
  };

  /**
   * We set it to null so the instances of the GlobalStoreAbstract can override it.
   */
  protected onInitialize = null;
  protected onChange = null;

  /**
   * Instead of calling onInitialize and onChange directly, we call the _onInitialize and _onChange
   * This allows the concat the logic of the GlobalStore with the logic of the extension class.
   */
  protected onInit = ((parameters: StoreTools<State, Metadata>) => {
    this._onInitialize?.(parameters);
  }) as typeof this.onInit;

  protected onStateChanged = ((
    args: StoreTools<State, Metadata> & StateChanges<State>
  ) => {
    this._onChange?.(args);
  }) as typeof this.onChange;
}
