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

    const isExtensionClass = this.constructor !== GlobalStore;
    if (isExtensionClass) return;

    (this as GlobalStore<TState, TMetadata, TStateSetter>).initialize();
  }

  protected onInitialize = ({
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

  protected onChange = ({
    getState,
  }: StateChangesParam<TState, TMetadata, NonNullable<TStateSetter>>) => {
    // avoid compatibility issues with SSR
    if (!isLocalStorageAvailable()) return;

    setLocalStorageItem({
      item: getState(),
      config: this.config,
    });
  };
}
