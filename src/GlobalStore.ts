import {
  ActionCollectionConfig,
  BaseMetadata,
  GlobalStoreCallbacks,
  StateChanges,
  StoreTools,
} from 'react-hooks-global-states/types';
import { GlobalStoreAbstract } from 'react-hooks-global-states/GlobalStoreAbstract';

import { LocalStorageConfig } from './types';
import { getLocalStorageItem } from './getLocalStorageItem';
import { setLocalStorageItem } from './setLocalStorageItem';

export class GlobalStore<
  State,
  Metadata extends BaseMetadata,
  ActionsConfig extends ActionCollectionConfig<State, Metadata> | undefined | unknown,
> extends GlobalStoreAbstract<State, Metadata, ActionsConfig> {
  protected localStorage: LocalStorageConfig | null = null;

  constructor(state: State);

  constructor(
    state: State,
    args: {
      metadata?: Metadata;
      callbacks?: GlobalStoreCallbacks<State, Metadata>;
      actions?: ActionsConfig;
      name?: string;
      localStorage?: LocalStorageConfig;
    },
  );

  constructor(
    state: State,
    args: {
      metadata?: Metadata;
      callbacks?: GlobalStoreCallbacks<State, Metadata>;
      actions?: ActionsConfig;
      name?: string;
      localStorage?: LocalStorageConfig;
    } = { metadata: {} as Metadata },
  ) {
    super(state, args);

    this.localStorage = args.localStorage ?? null;

    const isExtensionClass = this.constructor !== GlobalStore;
    if (isExtensionClass) return;

    (this as GlobalStore<State, Metadata, ActionsConfig>).initialize();
  }

  protected isLocalStorageAvailable = (config: LocalStorageConfig | null): config is LocalStorageConfig => {
    // check globalThis.localStorage avoid compatibility issues with SSR
    return Boolean(config?.key && globalThis?.localStorage);
  };

  protected _onInitialize = ({ setState, getState }: StoreTools<State, Metadata>): void => {
    if (!this.isLocalStorageAvailable(this.localStorage)) return;

    const restored = getLocalStorageItem<State>(this.localStorage);

    if (restored === null) {
      const state = getState();

      return setLocalStorageItem(state, this.localStorage);
    }

    setState(restored);
  };

  protected _onChange = ({ getState }: StoreTools<State, Metadata> & StateChanges<State>): void => {
    if (!this.isLocalStorageAvailable(this.localStorage)) return;

    setLocalStorageItem(getState(), this.localStorage);
  };

  /**
   * We set it to null so the instances of the GlobalStoreAbstract can override it.
   */
  protected onInitialize = null as unknown as (args: StoreTools<State, Metadata>) => void;
  protected onChange = null as unknown as (args: StoreTools<State, Metadata> & StateChanges<State>) => void;

  /**
   * Instead of calling onInitialize and onChange directly, we call the _onInitialize and _onChange
   * This allows the concat the logic of the GlobalStore with the logic of the extension class.
   */
  protected onInit = (parameters: StoreTools<State, Metadata>) => {
    this._onInitialize?.(parameters);
  };

  protected onStateChanged = (args: StoreTools<State, Metadata> & StateChanges<State>) => {
    this._onChange?.(args);
  };
}

export default GlobalStore;
