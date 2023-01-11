import * as IGlobalStore from './GlobalStoreTypes';
import ReactDOM from 'react-dom';
import {
  isPrimitive,
  formatToStore,
  formatFromStore,
  clone,
} from 'json-storage-formatter';

import { useEffect, useState } from 'react';

export type IValueWithMedaData = {
  _type_?: 'map' | 'set' | 'date';
  value?: unknown;
};

export const debounce = <T extends Function>(callback: T, wait = 300): T => {
  let timer: NodeJS.Timeout;

  return ((...args: unknown[]) => {
    clearTimeout(timer);

    timer = setTimeout(() => {
      callback(...args);
    }, wait);
  }) as unknown as T;
};

/**
* This is a class to create global-store objects
* @template IState
* @param {IState} state - Initial state,
* @template IActions
* @param {IActions} actions - An specific api to restrict the use of the state,
* this will disable the default return of the state-setter of the hook, and instead will return the API
* @param {string} persistStoreAs - A name if you want to persist the state of the store in localstorage
* */
export class GlobalStore<
  IState,
  IActions extends IGlobalStore.IActionCollectionConfig<IState> | null = null
> implements IGlobalStore.IGlobalState<IState, IActions> {

  protected subscribers: IGlobalStore.StateSetter<IState>[] = [];

  public get isPersistStore() {
    return !!this.persistStoreAs;
  }

  constructor(protected state: IState, protected actions: IActions = null as IActions, protected persistStoreAs: string | null = null) {}

  private storedStateItem: IState | undefined = undefined;

  protected localStorageGetItem(): string | null {
    return localStorage.getItem(this.persistStoreAs as string);
  }

  protected getStoreItem(): IState {
    if (this.storedStateItem !== undefined) return this.storedStateItem;

    const item = this.localStorageGetItem();

    if (item) {
      const value = JSON.parse(item) as IState;
      const newState = formatFromStore(value) as IState;

      this.state = newState;
    }

    return this.state;
  }

  protected localStorageSetItem(valueToStore: string): void {
    localStorage.setItem(this.persistStoreAs as string, valueToStore);
  }

  protected setStoreItem(): void {
    if (this.storedStateItem === this.state) return;

    this.storedStateItem = this.state;

    const valueToStore = formatToStore(this.state);

    this.localStorageSetItem(JSON.stringify(valueToStore));
  }

  protected getPersistStoreValue = (): IState => this.getStoreItem();

  protected getStateCopy = (): IState => Object.freeze(clone(this.state));

  /**
   * Returns a global hook that will share information across components by subscribing them to a specific store.
   * @return [currentState, GlobalState.IHookResult<IState, IActions, IApi>]
   */
  public getHook = <
    IApi extends IGlobalStore.IActionCollectionResult<IState, IActions>
    | null = IActions extends null ? null : IGlobalStore.IActionCollectionResult<IState, IActions>
  >() => (): [
    IState,
    IGlobalStore.IHookResult<IState, IActions, IApi>,
  ] => {
    const [value, setter] = useState(this.state);
    const valueWrapper: IState = this.isPersistStore ? this.getPersistStoreValue() : value;

    useEffect(() => {
      this.subscribers.push(setter as IGlobalStore.StateSetter<IState>);

      return () => {
        this.subscribers = this.subscribers.filter((hook) => setter !== hook);
      };
    }, []);

    return [
      valueWrapper as IState,
      this.stateOrchestrator as IGlobalStore.IHookResult<IState, IActions, IApi>,
    ];
  };

  /**
   * This is an access to the subscribers queue and to the current state of a specific store...
   * THIS IS NOT A REACT-HOOK, so you could use it everywhere example other hooks, and services.
   * @return [currentState, GlobalState.IHookResult<IState, IActions, IApi>]
   */
  public getHookDecoupled = <
    IApi extends IGlobalStore.IActionCollectionResult<IState, IActions>
    | null = IActions extends null ? null : IGlobalStore.IActionCollectionResult<IState, IActions>
  > (): [
    () => IState,
    IGlobalStore.IHookResult<IState, IActions, IApi>,
  ] => {
    const valueWrapper: () => IState = this.isPersistStore ? () => this.getPersistStoreValue() : () => this.state;

    return [
      valueWrapper,
      this.stateOrchestrator as IGlobalStore.IHookResult<IState, IActions, IApi>,
    ];
  };

  private _stateOrchestrator: IGlobalStore.StateSetter<IState> | IGlobalStore.IActionCollectionResult<IState, IActions> | null = null;

  protected get stateOrchestrator(): IGlobalStore.StateSetter<IState> | IGlobalStore.IActionCollectionResult<IState, IActions> {
    if (this._stateOrchestrator) return this._stateOrchestrator;

    if (this.actions) {
      this._stateOrchestrator = this.getActions() as IGlobalStore.IActionCollectionResult<IState, IActions>;
    } else if (this.persistStoreAs) {
      this._stateOrchestrator = this.globalSetterToPersistStoreAsync as IGlobalStore.StateSetter<IState>;
    } else {
      this._stateOrchestrator = this.globalSetter as IGlobalStore.StateSetter<IState>;
    }

    return this._stateOrchestrator as IGlobalStore.StateSetter<IState> | IGlobalStore.IActionCollectionResult<IState, IActions>;
  }

  /**
   **  [subscriber-update-callback, hook, newState]
   */
  protected static batchedUpdates: [() => void, object, object][] = [];

  protected globalSetter = (setter: Partial<IState> | ((state: IState) => Partial<IState>)) => {
    const partialState = typeof setter === 'function' ? setter(this.getStateCopy()) : setter;
    let newState = isPrimitive(partialState) || Array.isArray(partialState)
      ? partialState : { ...this.state, ...partialState };

    // avoid perform multiple update batches by accumulating state changes of the same hook
    GlobalStore.batchedUpdates = GlobalStore.batchedUpdates.filter(([, hook, previousState]) => {
      const isSameHook = hook === this;

      if (isSameHook) {
        // eslint-disable-next-line no-console
        console.warn('You should try avoid call the same state-setter multiple times at one execution line');
        newState = isPrimitive(newState) || Array.isArray(partialState)
          ? newState : { ...previousState, ...newState };
      }
      return !isSameHook;
    });

    this.state = newState as IState;

    // batch store updates
    GlobalStore.batchedUpdates.push([() => this.subscribers.forEach((updateChild) => updateChild(newState)), this, newState]);

    GlobalStore.ExecutePendingBatches();
  };

  protected globalSetterToPersistStoreAsync = async (setter: Partial<IState> | ((state: IState) => Partial<IState>)): Promise<void> => {
    this.globalSetter(setter);
    this.setStoreItem();
  };

  // avoid multiples calls to batchedUpdates
  static ExecutePendingBatches = () => {
    const reactBatchedUpdates = ReactDOM.unstable_batchedUpdates || ((mock: () => void) => mock());

    reactBatchedUpdates(() => {
      GlobalStore.batchedUpdates.forEach(([execute]) => {
        execute();
      });

      GlobalStore.batchedUpdates = [];
    });
  }

  protected getActions = <IApi extends IGlobalStore.IActionCollectionResult<IState, IGlobalStore.IActionCollectionConfig<IState>>>(): IApi => {
    const actions = this.actions as IGlobalStore.IActionCollectionConfig<IState>;
    // Setter is allways async because of the render batch
    const setter = this.isPersistStore ? this.globalSetterToPersistStoreAsync : this.globalSetter;

    return Object.keys(actions).reduce(
      (accumulator, key) => ({
        ...accumulator,
        [key]: async (...parameres: unknown[]) => {
          let promise;
          const setterWrapper: IGlobalStore.StateSetter<IState> = (value: Partial<IState> | ((state: IState) => Partial<IState>)) => {
            promise = setter(value);
            return promise;
          };
          const result = actions[key](...parameres)(setterWrapper, this.getStateCopy());
          const resultPromise = Promise.resolve(result) === result ? result : Promise.resolve();

          await Promise.all([promise, resultPromise]);

          return result;
        },
      }),
      {} as IApi,
    );
  };

}

export default GlobalStore;
