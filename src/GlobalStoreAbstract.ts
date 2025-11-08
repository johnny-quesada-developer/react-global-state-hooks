import {
  ActionCollectionConfig,
  ActionCollectionResult,
  BaseMetadata,
  StateChanges,
  StoreTools,
} from 'react-hooks-global-states/types';

import { GlobalStore } from './GlobalStore';

export abstract class GlobalStoreAbstract<
  State,
  Metadata extends BaseMetadata,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  ActionsConfig extends ActionCollectionConfig<State, Metadata> | null | {},
  PublicStateMutator = keyof ActionsConfig extends never | undefined
    ? React.Dispatch<React.SetStateAction<State>>
    : ActionCollectionResult<State, Metadata, NonNullable<ActionsConfig>>,
> extends GlobalStore<State, Metadata, ActionsConfig> {
  // @ts-expect-error TS6133
  protected onInit = (args: StoreTools<State, PublicStateMutator, Metadata>) => {
    // @ts-expect-error TS2345
    this._onInitialize(args);
    this.onInitialize?.(args);
  };

  // @ts-expect-error TS2345
  override onStateChanged = (args: StoreTools<State, PublicStateMutator, Metadata> & StateChanges<State>) => {
    // @ts-expect-error TS2345
    this._onInitialize(args);
    this.onChange?.(args);
  };

  // @ts-expect-error TS2345
  protected abstract onInitialize: (args: StoreTools<State, PublicStateMutator, Metadata>) => void;

  // @ts-expect-error TS2345
  protected abstract onChange: (
    args: StoreTools<State, PublicStateMutator, Metadata> & StateChanges<State>,
  ) => void;
}

export default GlobalStoreAbstract;
