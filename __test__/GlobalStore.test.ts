import { formatFromStore } from 'json-storage-formatter/formatFromStore';
import { formatToStore } from 'json-storage-formatter/formatToStore';
import { GlobalStore, type ActionCollectionConfig, type ActionCollectionResult, type StoreTools } from '..';
import { act, renderHook } from '@testing-library/react';

describe('GlobalStore Basic', () => {
  it('should be able to create a new instance with state', () => {
    const stateValue = 'test';

    const store = new GlobalStore(stateValue, {
      localStorage: {
        key: 'key1',
        encrypt: false,
      },
    });

    expect(store).toBeInstanceOf(GlobalStore);
    expect(store.getState()).toBe(stateValue);
  });

  it('state setter should be a function', () => {
    const stateValue = 'test';
    const store = new GlobalStore(stateValue, {
      localStorage: {
        key: 'key1',
        encrypt: false,
      },
    });

    const [, setState] = store.stateControls();

    expect(setState).toBeInstanceOf(Function);
  });

  it('should be able to get the state', () => {
    const stateValue = 1;

    debugger;
    const store = new GlobalStore(stateValue, {
      localStorage: {
        key: 'key1',
        // by default, the state is encrypted to base64, but you can disable it, or use a custom function for encrypting
        encrypt: false,
      },
    });

    const [getState] = store.stateControls();

    expect(getState()).toBe(stateValue);
  });

  it('should be able to set the state', () => {
    const stateValue = 'test';

    const store = new GlobalStore(stateValue, {
      localStorage: {
        key: 'key1',
        encrypt: false,
      },
    });

    const [getState, setState] = store.stateControls();

    setState('test2');

    expect(getState()).toBe('test2');
  });

  it('should notify initialize all subscribers of the store', () => {
    const stateValue = 'test';
    const stateValue2 = 'test2';

    const store = new GlobalStore(stateValue, {
      localStorage: {
        key: 'key1',
        encrypt: false,
      },
    });

    const useHook = store.getHook();
    const [getState, setState] = store.stateControls();

    renderHook(() => useHook());
    renderHook(() => useHook());

    const [[_, subscriber1], [__, subscriber2]] = store.subscribers;
    jest.spyOn(subscriber1, 'callback');
    jest.spyOn(subscriber2, 'callback');

    act(() => {
      setState(stateValue2);
    });

    expect(getState()).toBe(stateValue2);
    expect(subscriber1.callback).toHaveBeenCalledTimes(1);
    expect(subscriber2.callback).toHaveBeenCalledTimes(1);
  });
});

describe('GlobalStore Persistence', () => {
  it('should be able to persist the state', () => {
    const stateValue = 'test';

    const store = new GlobalStore(stateValue, {
      localStorage: {
        key: 'key1',
        encrypt: false,
      },
    });

    const [getState] = store.stateControls();

    expect(getState()).toBe(stateValue);
    expect(localStorage.getItem('key1')).toBe(JSON.stringify(stateValue));
  });

  it('should be able to restore the state', () => {
    jest.spyOn(localStorage, 'getItem');
    localStorage.setItem('key1', '"test"');

    const store = new GlobalStore('', {
      localStorage: {
        key: 'key1',
        encrypt: false,
      },
    });

    const [getState] = store.stateControls();

    expect(getState()).toBe('test');

    expect(localStorage.getItem('key1')).toEqual('"test"');
  });

  it('should be able to restore state type Set', () => {
    const stateValue = new Set(['test', 'test2']);

    new GlobalStore(stateValue, {
      localStorage: {
        key: 'key1',
        encrypt: false,
      },
    });

    const storedItem = localStorage.getItem('key1');
    const jsonParsed = JSON.parse(storedItem as string);

    const restoredState = formatFromStore(jsonParsed);

    expect(restoredState).toBeInstanceOf(Set);
    expect(restoredState).toEqual(stateValue);
  });

  it('should be able to restore state type Map', () => {
    const stateValue = new Map([
      ['test', 'test2'],
      ['test3', 'test4'],
    ]);

    new GlobalStore(stateValue, {
      localStorage: {
        key: 'key1',
        encrypt: false,
      },
    });

    const storedItem = localStorage.getItem('key1');
    const jsonParsed = JSON.parse(storedItem as string);

    const restoredState = formatFromStore(jsonParsed);

    expect(restoredState).toBeInstanceOf(Map);
    expect(restoredState).toEqual(stateValue);
  });

  it('should be able to restore state type Date', () => {
    const stateValue = new Date();

    new GlobalStore(stateValue, {
      localStorage: {
        key: 'key1',
        encrypt: false,
      },
    });

    const storedItem = localStorage.getItem('key1');
    const jsonParsed = JSON.parse(storedItem as string);

    const restoredState = formatFromStore(jsonParsed);

    expect(restoredState).toBeInstanceOf(Date);
    expect(restoredState).toEqual(stateValue);
  });
});

const countStoreInitialState = 1;
const createCountStoreWithActions = (spy?: jest.Mock) => {
  const countStore = new GlobalStore(countStoreInitialState, {
    actions: {
      log(message: string) {
        return (): void => spy?.(message);
      },

      increase(increase: number = 1) {
        return ({ setState, getState }: StoreTools<number>) => {
          setState((state) => state + increase);

          // this also work, the only trouble is that typescript will not recognize the action types
          // and log will be an "any" type
          this.log('increase');

          return getState();
        };
      },

      decrease(decrease: number = 1) {
        return ({ setState, getState }: StoreTools<number>) => {
          setState((state) => state - decrease);

          this.log('decrease');

          return getState();
        };
      },
    },
  });

  return countStore as typeof countStore & {
    stateWrapper: {
      state: number;
    };
    actionsConfig: ActionCollectionConfig<number, unknown>;
    getStoreActionsMap: (param: {
      invokerSetState?: React.Dispatch<React.SetStateAction<number>>;
    }) => ActionCollectionResult<number, null, ActionCollectionConfig<number, null>>;
  };
};

describe('GlobalStore Basic', () => {
  it('should be able to create a new instance with state', () => {
    const stateValue = 'test';
    const store = new GlobalStore(stateValue);

    expect(store).toBeInstanceOf(GlobalStore);
    expect((store as unknown as { stateWrapper: { state: unknown } }).stateWrapper.state).toBe(stateValue);
  });

  it('state setter should be a function', () => {
    const stateValue = 'test';
    const store = new GlobalStore(stateValue);

    const [, setState] = store.stateControls();

    expect(setState).toBeInstanceOf(Function);
  });

  it('should be able to get the state', () => {
    const stateValue = 1;

    const store = new GlobalStore(stateValue, {
      localStorage: {
        key: 'key',
      },
    });

    const [getState] = store.stateControls();

    expect(getState()).toBe(stateValue);
  });

  it('should be able to set the state', () => {
    const stateValue = 'test';
    const store = new GlobalStore(stateValue);

    const [, setState] = store.stateControls();

    setState('test2');

    expect((store as unknown as { stateWrapper: { state: unknown } }).stateWrapper.state).toBe('test2');
  });

  it('should be able to set the state with a function', () => {
    const stateValue = 'test';
    const store = new GlobalStore(stateValue);

    const [, setState] = store.stateControls();

    setState((state) => `${state}2`);

    expect((store as unknown as { stateWrapper: { state: unknown } }).stateWrapper.state).toBe('test2');
  });

  it('should notify initialize all subscribers of the store', () => {
    const stateValue = 'test';
    const stateValue2 = 'test2';

    const store = new GlobalStore(stateValue);

    const useHook = store.getHook();
    const [getState, setState] = store.stateControls();

    renderHook(() => useHook());
    renderHook(() => useHook());

    const [[_, subscriber1], [__, subscriber2]] = store.subscribers;
    jest.spyOn(subscriber1, 'callback');
    jest.spyOn(subscriber2, 'callback');

    act(() => {
      setState(stateValue2);
    });

    expect(getState()).toBe(stateValue2);
    expect(subscriber1.callback).toHaveBeenCalledTimes(1);
    expect(subscriber2.callback).toHaveBeenCalledTimes(1);
  });
});

describe('GlobalStore with actions', () => {
  it('should be able to create a new instance with state and actions, setter should be and object', () => {
    const store = createCountStoreWithActions();

    expect(store).toBeInstanceOf(GlobalStore);
    expect(store.stateWrapper.state).toBe(countStoreInitialState);
    expect(store.actionsConfig).toBeDefined();

    const actions = store.getStoreActionsMap({});

    expect(actions).not.toBeInstanceOf(Function);
    expect(actions.increase).toBeDefined();
  });

  it('should be able to get the state', () => {
    const store = createCountStoreWithActions();

    const [getState] = store.stateControls();

    expect(getState()).toBe(countStoreInitialState);
  });

  it('should be able to set the state', () => {
    const store = createCountStoreWithActions();

    const [getState, actions] = store.stateControls();

    actions.increase();

    expect(getState()).toBe(2);
  });

  it('should initialize all subscribers of the store', () => {
    const store = createCountStoreWithActions();

    const useHook = store.getHook();
    const [getState] = store.stateControls();

    renderHook(() => useHook());
    renderHook(() => useHook());

    const [[_, subscriber1], [__, subscriber2]] = store.subscribers;
    jest.spyOn(subscriber1, 'callback');
    jest.spyOn(subscriber2, 'callback');

    expect(getState()).toBe(countStoreInitialState);
    expect(subscriber1.callback).toHaveBeenCalledTimes(0);
    expect(subscriber2.callback).toHaveBeenCalledTimes(0);
  });

  it('should update all subscribers of the store', () => {
    const store = createCountStoreWithActions();

    const useHook = store.getHook();
    const [getState, actions] = store.stateControls();

    renderHook(() => useHook());
    renderHook(() => useHook());

    const [[_, subscriber1], [__, subscriber2]] = store.subscribers;
    jest.spyOn(subscriber1, 'callback');
    jest.spyOn(subscriber2, 'callback');

    act(() => {
      actions.increase();
    });

    expect(getState()).toBe(2);
    expect(subscriber1.callback).toHaveBeenCalledTimes(1);
    expect(subscriber2.callback).toHaveBeenCalledTimes(1);
  });
});

describe('GlobalStore with configuration callbacks', () => {
  it('should execute onInit callback', () => {
    expect.assertions(6);

    const initialState = { count: 0 };
    const onInitSpy = jest.fn();

    new GlobalStore(initialState, {
      callbacks: {
        onInit: (parameters) => {
          onInitSpy();

          const { setState, getState, getMetadata, setMetadata, actions } = parameters;

          expect(getState()).toEqual(initialState);
          expect(getMetadata()).toEqual({});
          expect(setState).toBeInstanceOf(Function);
          expect(setMetadata).toBeInstanceOf(Function);
          expect(actions).toBe(null);
        },
      },
    });

    expect(onInitSpy).toHaveBeenCalledTimes(1);
  });

  it('should execute onInit callback with metadata', () => {
    expect.assertions(1);

    const initialState = { count: 0 };
    const onInitSpy = jest.fn();

    new GlobalStore(initialState, {
      callbacks: {
        onInit: onInitSpy,
      },
    });

    expect(onInitSpy).toHaveBeenCalledTimes(1);
  });

  it('should execute onSubscribed callback every time a subscriber is added', () => {
    expect.assertions(18);

    let onSubscribedSpy = jest.fn();

    const store = new GlobalStore(
      { count: 0 },
      {
        callbacks: {
          onSubscribed: (parameters) => {
            onSubscribedSpy();

            const { setState, getState, getMetadata, setMetadata, actions } = parameters;

            // this code will be execute 3 times
            expect(getMetadata()).toEqual({});
            expect(setState).toBeInstanceOf(Function);
            expect(setMetadata).toBeInstanceOf(Function);
            expect(actions).toBe(null);
            expect(getState()).toEqual({ count: 0 });
          },
        },
      }
    );

    expect(onSubscribedSpy).toHaveBeenCalledTimes(0);

    const useStore = store.getHook();

    renderHook(() => useStore());

    expect(onSubscribedSpy).toHaveBeenCalledTimes(1);

    renderHook(() => useStore());
    renderHook(() => useStore());

    expect(onSubscribedSpy).toHaveBeenCalledTimes(3);
  });

  it('should execute onStateChanged callback every time the state is changed', () => {
    expect.assertions(7);

    const onStateChangedSpy = jest.fn();

    const store = new GlobalStore(
      { count: 0 },
      {
        callbacks: {
          onStateChanged: (parameters) => {
            onStateChangedSpy();

            const { setState, getState, getMetadata, setMetadata, actions } = parameters;

            expect(getMetadata()).toEqual({});
            expect(setState).toBeInstanceOf(Function);
            expect(setMetadata).toBeInstanceOf(Function);
            expect(actions).toBe(null);
            expect(getState()).toEqual({ count: 1 });
          },
        },
      }
    );

    expect(onStateChangedSpy).toHaveBeenCalledTimes(0);

    const [, setState] = store.stateControls();

    setState((state) => ({ count: state.count + 1 }));

    expect(onStateChangedSpy).toHaveBeenCalledTimes(1);
  });

  it('should execute computePreventStateChange callback before state is changed and continue if it returns false', () => {
    expect.assertions(7);

    const computePreventStateChangeSpy = jest.fn();

    const store = new GlobalStore(
      { count: 0 },
      {
        callbacks: {
          computePreventStateChange: (parameters) => {
            computePreventStateChangeSpy();

            const { setState, getMetadata, setMetadata, actions } = parameters;

            expect(getMetadata()).toEqual({});
            expect(setState).toBeInstanceOf(Function);
            expect(setMetadata).toBeInstanceOf(Function);
            expect(actions).toBe(null);

            return false;
          },
        },
      }
    );

    expect(computePreventStateChangeSpy).toHaveBeenCalledTimes(0);

    const [getState, setState] = store.stateControls();

    setState((state) => ({ count: state.count + 1 }));

    expect(computePreventStateChangeSpy).toHaveBeenCalledTimes(1);
    expect(getState()).toEqual({ count: 1 });
  });

  it('should execute computePreventStateChange callback before state is changed and prevent state change if it returns true', () => {
    expect.assertions(7);

    const computePreventStateChangeSpy = jest.fn();

    const store = new GlobalStore(
      { count: 0 },
      {
        callbacks: {
          computePreventStateChange: (parameters) => {
            computePreventStateChangeSpy();

            const { setState, getMetadata, setMetadata, actions } = parameters;

            expect(getMetadata()).toEqual({});
            expect(setState).toBeInstanceOf(Function);
            expect(setMetadata).toBeInstanceOf(Function);
            expect(actions).toBe(null);

            return true;
          },
        },
      }
    );

    expect(computePreventStateChangeSpy).toHaveBeenCalledTimes(0);

    const [getState, setState] = store.stateControls();

    setState((state) => ({ count: state.count + 1 }));

    expect(computePreventStateChangeSpy).toHaveBeenCalledTimes(1);
    expect(getState()).toEqual({ count: 0 });
  });
});

describe('Custom store by using config parameter', () => {
  const getInitialState = () => {
    return new Map([
      [1, { name: 'john' }],
      [2, { name: 'doe' }],
    ]);
  };

  it('should initialize the store with the initial state where there is no  storage data', () => {
    const initialState = getInitialState();
    const { localStorage } = globalThis;

    const onStateChangedSpy = jest.fn();
    const onInitSpy = jest.fn();
    jest.spyOn(localStorage, 'getItem');

    let store: GlobalStore<any, any, any>;

    store = new GlobalStore(initialState, {
      callbacks: {
        onInit: (parameters) => {
          onInitSpy();

          const { setState } = parameters;

          const stored = localStorage.getItem('items') ?? null;

          if (!stored) {
            return;
          }

          const items = formatFromStore(JSON.parse(stored)) as Map<number, { name: string }>;

          setState(items);
        },
        onStateChanged: ({ getState }) => {
          onStateChangedSpy();

          const newState = getState();

          localStorage.setItem(
            'items',
            formatToStore(newState, {
              stringify: true,
            })
          );
        },
      },
    });

    const [getState] = store.stateControls();

    expect(onInitSpy).toHaveBeenCalledTimes(1);
    expect(onStateChangedSpy).toHaveBeenCalledTimes(0);
    expect(localStorage.getItem('items')).toBe(null);
    expect(getState()).toEqual(initialState);
  });

  it('should initialize the store with the  storage data where there is storage data', () => {
    const initialState = getInitialState();
    const { localStorage } = globalThis;
    const onStateChangedSpy = jest.fn();
    const onInitSpy = jest.fn();
    jest.spyOn(localStorage, 'getItem');

    const storedMap = new Map(initialState);
    storedMap.set(3, { name: 'jane' });

    localStorage.setItem(
      'items',
      formatToStore(storedMap, {
        stringify: true,
      })
    );

    const store = new GlobalStore(initialState, {
      callbacks: {
        onInit: (parameters) => {
          onInitSpy();

          const { setState } = parameters;

          const stored = localStorage.getItem('items') ?? null;

          if (!stored) {
            return;
          }

          const items = formatFromStore(JSON.parse(stored)) as Map<number, { name: string }>;

          setState(items);
        },
        onStateChanged: ({ getState }) => {
          onStateChangedSpy();

          const newState = getState();

          localStorage.setItem(
            'items',
            formatToStore(newState, {
              stringify: true,
            })
          );
        },
      },
    });

    const [getState] = store.stateControls();

    expect(onInitSpy).toHaveBeenCalledTimes(1);
    expect(onStateChangedSpy).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('items')).toEqual(
      '{"$t":"map","$v":[[1,{"name":"john"}],[2,{"name":"doe"}],[3,{"name":"jane"}]]}'
    );

    expect(getState()).toEqual(storedMap);
  });

  it('should be able to update the store  storage', () => {
    const initialState = getInitialState();
    const { localStorage } = globalThis;
    jest.spyOn(localStorage, 'getItem');

    const store = new GlobalStore(initialState, {
      callbacks: {
        onInit: (parameters) => {
          const { setState } = parameters;
          const stored = localStorage.getItem('items') ?? null;

          if (!stored) {
            return;
          }

          const items = formatFromStore(JSON.parse(stored)) as Map<number, { name: string }>;

          setState(items);
        },
        onStateChanged: ({ getState }) => {
          const newState = getState();

          localStorage.setItem(
            'items',
            formatToStore(newState, {
              stringify: true,
            })
          );
        },
      },
    });

    const [getState] = store.stateControls();

    const { result } = renderHook(() => store.getHook()());
    const [, setState] = result.current;

    const newState = new Map(getState());
    newState.set(3, { name: 'jane' });

    act(() => {
      setState(newState);
    });

    expect(localStorage.getItem('items')).toEqual(
      '{"$t":"map","$v":[[1,{"name":"john"}],[2,{"name":"doe"}],[3,{"name":"jane"}]]}'
    );

    expect(getState()).toEqual(newState);

    const stored = localStorage.getItem('items');

    expect(stored).toEqual('{"$t":"map","$v":[[1,{"name":"john"}],[2,{"name":"doe"}],[3,{"name":"jane"}]]}');
  });
});

describe('GlobalStore Accessing custom actions from other actions', () => {
  it('should be able to access custom actions from other actions', () => {
    expect.assertions(8);

    const logSpy = jest.fn();

    const store = createCountStoreWithActions(logSpy);

    const [getState, actions] = store.stateControls();

    expect(getState()).toEqual(1);
    expect(logSpy).toHaveBeenCalledTimes(0);

    act(() => {
      actions.increase();
    });

    expect(getState()).toEqual(2);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith('increase');

    act(() => {
      actions.decrease();
    });

    expect(getState()).toEqual(1);
    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenCalledWith('decrease');
  });
});
