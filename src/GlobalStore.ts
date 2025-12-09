import type {
  ActionCollectionConfig,
  ActionCollectionResult,
  AnyFunction,
  BaseMetadata,
  GlobalStoreCallbacks,
  StateChanges,
} from 'react-hooks-global-states/types';

import GlobalStoreBase from 'react-hooks-global-states/GlobalStore';

import type { LocalStorageConfig, ItemEnvelope } from './types';

import tryCatch from './tryCatch';
import formatFromStore from 'json-storage-formatter/formatFromStore';
import formatToStore from 'json-storage-formatter/formatToStore';
import isNil from 'json-storage-formatter/isNil';

const defaultStorageVersion = -1;

export class GlobalStore<
  State,
  Metadata extends BaseMetadata,
  ActionsConfig extends ActionCollectionConfig<State, Metadata> | undefined | unknown,
  PublicStateMutator = keyof ActionsConfig extends never | undefined
    ? React.Dispatch<React.SetStateAction<State>>
    : ActionCollectionResult<State, Metadata, NonNullable<ActionsConfig>>,
> extends GlobalStoreBase<State, Metadata, ActionsConfig> {
  protected localStorage: LocalStorageConfig<State> | null = null;

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
      localStorage?: LocalStorageConfig<State>;
    },
  );

  constructor(
    state: State,
    args: {
      metadata?: Metadata;
      callbacks?: GlobalStoreCallbacks<State, PublicStateMutator, Metadata>;
      actions?: ActionsConfig;
      name?: string;
      localStorage?: LocalStorageConfig<State>;
    } = { metadata: {} as Metadata },
  ) {
    // @ts-expect-error TS2345
    super(state, args);

    this.localStorage = args.localStorage ?? null;

    const isExtensionClass = this.constructor !== GlobalStore;
    if (isExtensionClass) return;

    (this as GlobalStore<State, Metadata, ActionsConfig>).initialize();
  }

  protected isPersistStorageAvailable = () => {
    // check globalThis.localStorage avoid compatibility issues with SSR
    return Boolean(this.localStorage?.key && globalThis?.localStorage);
  };

  // we are overriding the onInit to add local storage restoration logic
  protected onInit = (): void => {
    const storageConfig = this.localStorage;
    if (!storageConfig || !this.isPersistStorageAvailable()) return;

    // versioning parameters
    const versioning = storageConfig.versioning;

    // try to restore the state from local storage
    const { result: restoredEnvelope, error: initializationError } = tryCatch(
      (): ItemEnvelope<State> | null => {
        const getFn = storageConfig.adapter?.getItem;
        if (!getFn) return this.getStorageItem();

        return {
          s: getFn(storageConfig.key),
          v: versioning?.version ?? defaultStorageVersion,
        };
      },
    );

    // error while retrieving the item from local storage
    if (initializationError) {
      this.handleStorageError(initializationError);
      this.updateStateWithValidation(this.getState());
      return;
    }

    // nothing to restore
    if (!restoredEnvelope) {
      // set the initial state in local storage
      this.updateStateWithValidation(this.getState());
      return;
    }

    const isSameVersion = restoredEnvelope.v === versioning?.version;
    const migratorFn = versioning?.migrator;

    // versions match or no migrator provided - just validate and update if possible
    // if the adapter is provided we cannot control versioning so we skip migration
    if (isSameVersion || !migratorFn || storageConfig.adapter) {
      this.updateStateWithValidation(restoredEnvelope.s);
      return;
    }

    // [VERSIONING] try to executed a migration
    const { result: migrated, error: migrateError } = tryCatch(() => {
      return migratorFn({
        legacy: restoredEnvelope.s,
        initial: this.getState(),
      });
    });

    if (!migrateError) {
      this.updateStateWithValidation(migrated!);
      return;
    }

    // error during migration
    this.handleStorageError(migrateError);
    this.updateStateWithValidation(this.getState());
  };

  public trySetStorageItem = (state: State) => {
    const storageConfig = this.localStorage;
    if (!storageConfig) return;

    const { error } = tryCatch(() => {
      const setFn = storageConfig.adapter?.setItem;
      if (!setFn) return this.setStorageItem(state);

      setFn(storageConfig.key, state);
    });

    if (!error) return;

    this.handleStorageError(error);
  };

  // helper to validate and update the state
  public updateStateWithValidation = (state: State) => {
    const storageConfig = this.localStorage;
    if (!storageConfig) return;

    const { result: sanitizedState, error: validationError } = tryCatch(() => {
      return storageConfig.validator({
        restored: state,
        initial: this.getState(),
      });
    });

    // there was an error during validation
    if (validationError) {
      this.handleStorageError(validationError);
      this.trySetStorageItem(this.getState());
      return;
    }

    // no value returned from the validator
    if (sanitizedState === undefined) {
      if (state === undefined) {
        // no restored, no sanitized state, adds to the store the initial state
        this.trySetStorageItem(this.getState());
        return;
      }

      // restored state counts like valid, add it to the state and to the storage
      this.setState(state!);
      this.trySetStorageItem(state);
      return;
    }

    // add the returned value from the validator
    this.setState(sanitizedState!);
    this.trySetStorageItem(sanitizedState!);
  };

  // we are overriding the onStateChanged to add local storage sync logic
  protected onStateChanged = ({ state }: StateChanges<State>): void => {
    const storageConfig = this.localStorage;
    if (!storageConfig || !this.isPersistStorageAvailable()) return;

    const { error } = tryCatch(() => {
      const setFn = storageConfig.adapter?.setItem;
      if (setFn) {
        return setFn(storageConfig.key, state);
      }

      this.setStorageItem(state);
    });

    if (!error) return;
    this.handleStorageError(error);
  };

  // retrieves a versioned item from the local storage
  public getStorageItem = (): ItemEnvelope<State> | null => {
    const json = globalThis.localStorage.getItem(this.localStorage!.key);

    const restoredEnvelope = isNil(json) ? null : formatFromStore<unknown>(json);

    assertEnvelopeFormat<State>(this.localStorage!.key, restoredEnvelope);

    return restoredEnvelope;
  };

  // add a versioned item to the local storage
  public setStorageItem = (state: State) => {
    const envelope: ItemEnvelope<State> = {
      s: state,
      v: this.localStorage?.versioning?.version ?? defaultStorageVersion,
    };

    const formatted = formatToStore(envelope);

    globalThis.localStorage.setItem(this.localStorage!.key, formatted);
  };

  public handleStorageError = (error: unknown) => {
    if (this.localStorage?.onError) {
      return this.localStorage.onError(error);
    }

    globalThis.console.error(
      [
        '[react-global-state-hooks]\n',
        '  localStorage sync error:',
        `[hook]:`,
        `  ${this._name}`,
        `[Localstorage Key]:`,
        `  ${this.localStorage?.key}`,
        `[Error]:`,
        `  ${error ?? 'undefined'}\n\n`,
        'Stacktrace:',
      ].join('\n'),
      (error as Error).stack,
    );
  };
}

function assertEnvelopeFormat<T>(key: string, value: unknown): asserts value is ItemEnvelope<T> | null {
  if (isNil(value)) return;
  if (typeof value === 'object' && 's' in value && 'v' in value) return;

  throw new Error(
    `[react-native-global-state-hooks] The value of the key "${key}" is not a valid storage envelope.`,
  );
}

export default GlobalStore;
