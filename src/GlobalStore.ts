import { GlobalStoreConfig } from './GlobalStore.types';
import { getLocalStorageItem, setLocalStorageItem } from './GlobalStore.utils';

import {
  ActionCollectionConfig,
  GlobalStoreAbstract,
  StateChangesParam,
  StateConfigCallbackParam,
  StateSetter,
} from 'react-hooks-global-states';

const isLocalStorageAvailable = () => {
  return !!globalThis?.localStorage;
};

export class GlobalStore<
  TState,
  TMetadata = null,
  TStateMutator extends
    | ActionCollectionConfig<TState, TMetadata>
    | StateSetter<TState> = StateSetter<TState>
> extends GlobalStoreAbstract<TState, TMetadata, NonNullable<TStateMutator>> {
  protected config: GlobalStoreConfig<TState, TMetadata, TStateMutator>;

  constructor(
    state: TState,
    config: GlobalStoreConfig<TState, TMetadata, TStateMutator> = {},
    actionsConfig: TStateMutator | null = null
  ) {
    super(state, config, actionsConfig);

    const isExtensionClass = this.constructor !== GlobalStore;
    if (isExtensionClass) return;

    (this as GlobalStore<TState, TMetadata, TStateMutator>).initialize();
  }

  protected _onInitialize = ({
    setState,
    getState,
  }: StateConfigCallbackParam<TState, TMetadata>) => {
    // avoid compatibility issues with SSR
    if (!isLocalStorageAvailable()) return;

    const localStorageKey = this.config?.localStorage?.key;

    if (!localStorageKey) return;

    const restored = getLocalStorageItem<TState>({
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
  }: StateChangesParam<TState, TMetadata, NonNullable<TStateMutator>>) => {
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
  protected onInit = (
    parameters: StateConfigCallbackParam<TState, TMetadata, TStateMutator>
  ) => {
    this._onInitialize?.(parameters);
  };

  protected onStateChanged = (
    parameters: StateChangesParam<TState, TMetadata, TStateMutator>
  ) => {
    this._onChange?.(parameters);
  };
}
