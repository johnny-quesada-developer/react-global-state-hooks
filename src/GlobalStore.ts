import * as IGlobalStore from './GlobalStoreTypes';
import ReactDOM from 'react-dom';
import {
  cloneDeep, debounce, isNil, isNumber, isBoolean, isString, isDate,
} from 'lodash';
import { useEffect, useState } from 'react';

export const isPrimitive = <T>(value: T) => isNil(value) || isNumber(value) || isBoolean(value) || isString(value) || typeof value === 'symbol';

export type IValueWithMedaData = {
  _type_?: 'map' | 'set' | 'date';
  value?: unknown;
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

  protected formatItemFromStore<T>(_obj: T): unknown {
    const obj = _obj as T & IValueWithMedaData;

    if (isPrimitive(obj)) {
      return obj;
    }

    const isMetaDate = obj?._type_ === 'date';

    if (isMetaDate) {
      return new Date(obj.value as string);
    }

    const isMetaMap = obj?._type_ === 'map';

    if (isMetaMap) {
      const mapData: [string, unknown][] = (((obj.value as []) ?? []) as [string, unknown][]).map(([key, item]) => [
        key,
        this.formatItemFromStore(item),
      ]);

      return new Map(mapData);
    }

    const isMetaSet = obj?._type_ === 'set';

    if (isMetaSet) {
      const setData: unknown[] = (obj.value as []) ?? [].map((item) => this.formatItemFromStore(item));

      return new Set(setData);
    }

    const isArray = Array.isArray(obj);

    if (isArray) {
      return (obj as unknown as Array<unknown>).map((item) => this.formatItemFromStore(item));
    }

    const keys = Object.keys(obj as Record<string, unknown>);

    return keys.reduce((acumulator, key) => {
      const unformatedValue: unknown = obj[key as keyof T];

      return {
        ...acumulator,
        [key]: this.formatItemFromStore(unformatedValue),
      };
    }, {});
  }

  protected localStorageGetItem(): string | null {
    return localStorage.getItem(this.persistStoreAs as string);
  }

  protected getStoreItem(): IState {
    if (this.storedStateItem !== undefined) return this.storedStateItem;

    const item = this.localStorageGetItem();

    if (item) {
      const value = JSON.parse(item) as IState;
      const primitive = isPrimitive(value);
      const newState = this.formatItemFromStore(value) as IState;

      this.state = primitive || Array.isArray(value) ? newState : { ...this.state, ...newState };
    }

    return this.state;
  }

  protected formatToStore<T>(obj: T): unknown {
    if (isPrimitive(obj)) {
      return obj;
    }

    const isArray = Array.isArray(obj);

    if (isArray) {
      return (obj as unknown as Array<unknown>).map((item) => this.formatToStore(item));
    }

    const isMap = obj instanceof Map;

    if (isMap) {
      const pairs = Array.from((obj as Map<unknown, unknown>).entries());

      return {
        _type_: 'map',
        value: pairs.map((pair) => this.formatToStore(pair)),
      };
    }

    const isSet = obj instanceof Set;

    if (isSet) {
      const values = Array.from((obj as Set<unknown>).values());

      return {
        _type_: 'set',
        value: values.map((value) => this.formatToStore(value)),
      };
    }

    if (isDate(obj)) {
      return {
        _type_: 'date',
        value: obj.toISOString(),
      };
    }

    const keys = Object.keys(obj as Record<string, unknown>);

    return keys.reduce((acumulator, key) => {
      const value = obj[key as keyof T];

      return ({
        ...acumulator,
        [key]: this.formatToStore(value),
      });
    }, {});
  }

  protected localStorageSetItem(valueToStore: string): void {
    localStorage.setItem(this.persistStoreAs as string, valueToStore);
  }

  protected setStoreItem(): void {
    if (this.storedStateItem === this.state) return;

    this.storedStateItem = this.state;

    const valueToStore = this.formatToStore(cloneDeep(this.state));

    this.localStorageSetItem(JSON.stringify(valueToStore));
  }

  protected getPersistStoreValue = (): IState => this.getStoreItem();

  protected getStateCopy = (): IState => Object.freeze(cloneDeep(this.state));

  /**
   * Returns a global hook that will share information across components by subscribing them to a specific store.
   * @return [currentState, GlobalState.IHookResult<IState, IActions, IApi>]
   */
  public getHook = <
    IApi extends IGlobalStore.IActionCollectionResult<IState, IActions> | null = IActions extends null ? null : IGlobalStore.IActionCollectionResult<IState, IActions>
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
    IApi extends IGlobalStore.IActionCollectionResult<IState, IActions> | null = IActions extends null ? null : IGlobalStore.IActionCollectionResult<IState, IActions>
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
      this._stateOrchestrator = this.globalSetterAsync as IGlobalStore.StateSetter<IState>;
    }

    return this._stateOrchestrator as IGlobalStore.StateSetter<IState> | IGlobalStore.IActionCollectionResult<IState, IActions>;
  }

  /**
   **  [subscriber-update-callback, hook, newState]
   */
  protected static batchedUpdates: [() => void, object, object][] = [];

  protected globalSetter = (setter: Partial<IState> | ((state: IState) => Partial<IState>), callback: () => void) => {
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

    GlobalStore.ExecutePendingBatchesCallbacks.push(callback);
    GlobalStore.ExecutePendingBatches();
  };

  protected globalSetterAsync =
    async (setter: Partial<IState> | ((state: IState) => Partial<IState>)):
    Promise<void> => new Promise((resolve) => this.globalSetter(setter, () => resolve()));

  protected globalSetterToPersistStoreAsync = async (setter: Partial<IState> | ((state: IState) => Partial<IState>)): Promise<void> => {
    await this.globalSetterAsync(setter);
    this.setStoreItem();
  };

  static ExecutePendingBatchesCallbacks: (() => void)[] = [];

  // avoid multiples calls to batchedUpdates
  static ExecutePendingBatches = debounce(() => {
    const reactBatchedUpdates = ReactDOM.unstable_batchedUpdates || ((mock: () => void) => mock());

    reactBatchedUpdates(() => {
      GlobalStore.batchedUpdates.forEach(([execute]) => {
        execute();
      });
      GlobalStore.batchedUpdates = [];
      GlobalStore.ExecutePendingBatchesCallbacks.forEach((callback) => callback());
      GlobalStore.ExecutePendingBatchesCallbacks = [];
    });
  }, 0);

  protected getActions = <IApi extends IGlobalStore.IActionCollectionResult<IState, IGlobalStore.IActionCollectionConfig<IState>>>(): IApi => {
    const actions = this.actions as IGlobalStore.IActionCollectionConfig<IState>;
    // Setter is allways async because of the render batch
    const setter = this.isPersistStore ? this.globalSetterToPersistStoreAsync : this.globalSetterAsync;

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
