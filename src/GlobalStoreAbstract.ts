import {
  ActionCollectionConfig,
  BaseMetadata,
  StateChanges,
  StoreTools,
} from 'react-hooks-global-states/types';

import { GlobalStore } from './GlobalStore';

export abstract class GlobalStoreAbstract<
  State,
  Metadata extends BaseMetadata,
  ActionsConfig extends ActionCollectionConfig<State, Metadata> | unknown
> extends GlobalStore<State, Metadata, ActionsConfig> {
  protected onInit = (args: StoreTools<State, Metadata>) => {
    this._onInitialize(args);
    this.onInitialize?.(args);
  };

  override onStateChanged = (args: StoreTools<State, Metadata> & StateChanges<State>) => {
    this._onInitialize(args);
    this.onChange?.(args);
  };

  protected abstract onInitialize: (args: StoreTools<State, Metadata>) => void;

  protected abstract onChange: (args: StoreTools<State, Metadata> & StateChanges<State>) => void;
}

export default GlobalStoreAbstract;
