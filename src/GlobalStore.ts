import { GlobalStoreConfig } from './GlobalStore.types';
import { getLocalStorageItem, setLocalStorageItem } from './GlobalStore.utils';

import {
  ActionCollectionConfig,
  GlobalStoreAbstract,
  StateChangesParam,
  StateConfigCallbackParam,
  StateSetter,
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

    const isExtensionClass = this.constructor !== GlobalStore;
    if (isExtensionClass) return;

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
}
