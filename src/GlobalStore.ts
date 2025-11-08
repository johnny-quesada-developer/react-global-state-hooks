import type {
  ActionCollectionConfig,
  ActionCollectionResult,
  AnyFunction,
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
  PublicStateMutator = keyof ActionsConfig extends never | undefined
    ? React.Dispatch<React.SetStateAction<State>>
    : ActionCollectionResult<State, Metadata, NonNullable<ActionsConfig>>,
> extends GlobalStoreAbstract<State, Metadata, ActionsConfig> {
  protected localStorage: LocalStorageConfig | null = null;

  constructor(state: State);

  constructor(
    state: State,
    args: {
      metadata?: Metadata;
      callbacks?: GlobalStoreCallbacks<
        State,
        PublicStateMutator extends AnyFunction ? null : PublicStateMutator,
        Metadata
      >;
      actions?: ActionsConfig;
      name?: string;
      localStorage?: LocalStorageConfig;
    },
  );

  constructor(
    state: State,
    args: {
      metadata?: Metadata;
      callbacks?: GlobalStoreCallbacks<State, PublicStateMutator, Metadata>;
      actions?: ActionsConfig;
      name?: string;
      localStorage?: LocalStorageConfig;
      // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    } = { metadata: {} as Metadata },
  ) {
    // @ts-expect-error TS2345
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

  protected _onInitialize = ({
    setState,
    getState,
  }: StoreTools<State, PublicStateMutator, Metadata>): void => {
    if (!this.isLocalStorageAvailable(this.localStorage)) return;

    const restored = getLocalStorageItem<State>(this.localStorage);

    if (restored === null) {
      const state = getState();

      return setLocalStorageItem(state, this.localStorage);
    }

    setState(restored);
  };

  protected _onChange = ({
    getState,
  }: StoreTools<State, PublicStateMutator, Metadata> & StateChanges<State>): void => {
    if (!this.isLocalStorageAvailable(this.localStorage)) return;

    setLocalStorageItem(getState(), this.localStorage);
  };

  /**
   * We set it to null so the instances of the GlobalStoreAbstract can override it.
   */
  // @ts-expect-error TS2345
  protected onInitialize = null as unknown as (args: StoreTools<State, PublicStateMutator, Metadata>) => void;

  // @ts-expect-error TS2345
  protected onChange = null as unknown as (
    args: StoreTools<State, PublicStateMutator, Metadata> & StateChanges<State>,
  ) => void;

  /**
   * Instead of calling onInitialize and onChange directly, we call the _onInitialize and _onChange
   * This allows the concat the logic of the GlobalStore with the logic of the extension class.
   */
  // @ts-expect-error TS2345
  protected onInit = (parameters: StoreTools<State, PublicStateMutator, Metadata>) => {
    this._onInitialize?.(parameters);
  };

  // @ts-expect-error TS2345
  protected onStateChanged = (
    args: StoreTools<State, PublicStateMutator, Metadata> & StateChanges<State>,
  ) => {
    this._onChange?.(args);
  };
}

export default GlobalStore;
