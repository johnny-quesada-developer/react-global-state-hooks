import {
  ActionCollectionConfig,
  StateSetter,
  StateConfigCallbackParam,
  StateChangesParam,
} from 'react-hooks-global-states';

import { GlobalStore } from './GlobalStore';
import { GlobalStoreConfig } from './GlobalStore.types';

/**
 * @description
 * Use this class to extends the capabilities of the GlobalStore.
 * by implementing the abstract methods onInitialize and onChange.
 * You can use this class to create a store with async storage.
 */
export abstract class GlobalStoreAbstract<
  TState,
  TMetadata = null,
  TStateMutator extends
    | ActionCollectionConfig<TState, TMetadata>
    | StateSetter<TState> = StateSetter<TState>
> extends GlobalStore<TState, TMetadata, TStateMutator> {
  constructor(
    state: TState,
    config: GlobalStoreConfig<TState, TMetadata, TStateMutator> = {},
    actionsConfig: TStateMutator | null = null
  ) {
    super(state, config, actionsConfig);
  }

  protected onInit = (
    parameters: StateConfigCallbackParam<TState, TMetadata, TStateMutator>
  ) => {
    this._onInitialize(parameters);
    this.onInitialize?.(parameters);
  };

  protected onStateChanged = (
    parameters: StateChangesParam<TState, TMetadata, TStateMutator>
  ) => {
    this._onInitialize(parameters);
    this.onChange?.(parameters);
  };

  protected abstract onInitialize: ({
    setState,
    setMetadata,
    getMetadata,
    getState,
    actions,
  }: StateConfigCallbackParam<TState, TMetadata, TStateMutator>) => void;

  protected abstract onChange: ({
    setState,
    setMetadata,
    getMetadata,
    getState,
    actions,
  }: StateChangesParam<TState, TMetadata, TStateMutator>) => void;
}
