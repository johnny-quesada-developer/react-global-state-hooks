import { type StoreTools, GlobalStore } from '..';
// import { type StoreTools, GlobalStore } from '../src';

import $it from './$it';
// import { type StoreTools, GlobalStore } from '../src/GlobalStore';

import { CancelablePromise, createDecoupledPromise } from 'easy-cancelable-promise';
import { formatFromStore, formatToStore, isNil } from 'json-storage-formatter';
import { getFakeAsyncStorage } from './getFakeAsyncStorage';
import { act } from 'react';

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

  return countStore;
};

describe('GlobalStore Basic', () => {
  $it('should be able to create a new instance with state', () => {
    const stateValue = 'test';
    const store = new GlobalStore(stateValue);

    expect(store).toBeInstanceOf(GlobalStore);
    expect(store.state).toBe(stateValue);
    expect(store.actions).toBe(null);
  });

  $it('state setter should be a function', () => {
    const stateValue = 'test';
    const store = new GlobalStore(stateValue);

    expect(store.setState).toBeInstanceOf(Function);

    expect(store.use.setState).toBeInstanceOf(Function);
  });

  $it('should be able to get the state', () => {
    const stateValue = 1;
    const store = new GlobalStore(stateValue);

    expect(store.getState()).toBe(stateValue);
    expect(store.use.getState()).toBe(stateValue);
  });

  $it('should be able to set the state', () => {
    const stateValue = 'test';
    const store = new GlobalStore(stateValue);

    store.use.setState('test2');

    expect(store.state).toBe('test2');
  });

  it('should be able to set the state with a function', () => {
    const stateValue = 'test';
    const store = new GlobalStore(stateValue);

    store.setState((state) => `${state}2`);

    expect(store.use.getState()).toBe('test2');
  });

  $it('should notify initialize all subscribers of the store', ({ renderHook }) => {
    const stateValue = 'test';
    const stateValue2 = 'test2';

    const store = new GlobalStore(stateValue);

    renderHook(() => store.use());
    renderHook(() => store.use());

    const [subscription1, subscription2] = store.subscribers;
    jest.spyOn(subscription1, 'onStoreChange');
    jest.spyOn(subscription2, 'onStoreChange');

    act(() => {
      store.setState(stateValue2);
    });

    expect(store.use.getState()).toBe(stateValue2);
    expect(subscription1.onStoreChange).toHaveBeenCalledTimes(1);
    expect(subscription2.onStoreChange).toHaveBeenCalledTimes(1);
  });
});

describe('GlobalStore with actions', () => {
  $it('should be able to create a new instance with state and actions, setter should be and object', () => {
    const store = createCountStoreWithActions();

    expect(store.actions).toBeDefined();
    expect(store.use.setState).toBeInstanceOf(Function);
    expect(store).toBeInstanceOf(GlobalStore);
    expect(store.state).toBe(countStoreInitialState);
    expect(store.actionsConfig).toBeDefined();
    expect(store.use).toBeInstanceOf(Function);

    const { actions } = store.getStoreActionsMap();

    if (isNil(actions)) return;

    expect(actions).not.toBeInstanceOf(Function);
    expect(actions.increase).toBeDefined();
  });

  $it('should be able to get the state', () => {
    const store = createCountStoreWithActions();

    expect(store.getState()).toBe(countStoreInitialState);
  });

  $it('should be able to set the state', () => {
    const store = createCountStoreWithActions();

    store.actions.increase();

    expect(store.getState()).toBe(2);
  });

  $it('should initialize all subscribers of the store', ({ renderHook }) => {
    const store = createCountStoreWithActions();

    renderHook(() => store.use());
    renderHook(() => store.use());

    const [subscription1, subscription2] = store.subscribers;
    jest.spyOn(subscription1, 'onStoreChange');
    jest.spyOn(subscription2, 'onStoreChange');

    expect(store.getState()).toBe(countStoreInitialState);
    expect(subscription1.onStoreChange).toHaveBeenCalledTimes(0);
    expect(subscription2.onStoreChange).toHaveBeenCalledTimes(0);
  });

  $it('should update all subscribers of the store', ({ renderHook }) => {
    const store = createCountStoreWithActions();

    renderHook(() => store.use());
    renderHook(() => store.use());

    const [subscription1, subscription2] = store.subscribers;
    jest.spyOn(subscription1, 'onStoreChange');
    jest.spyOn(subscription2, 'onStoreChange');

    act(() => {
      store.actions.increase();
    });

    expect(store.getState()).toBe(2);
    expect(subscription1.onStoreChange).toHaveBeenCalledTimes(1);
    expect(subscription2.onStoreChange).toHaveBeenCalledTimes(1);
  });
});

describe('GlobalStore with configuration callbacks', () => {
  $it('should execute onInit callback', () => {
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

  $it('should execute onInit callback with metadata', () => {
    expect.assertions(3);

    const initialState = { count: 0 };
    const onInitSpy = jest.fn();

    new GlobalStore(initialState, {
      metadata: {
        isAsyncStorageReady: false,
      },
      callbacks: {
        onInit: (parameters) => {
          onInitSpy();

          const { getMetadata, setMetadata } = parameters;

          expect(getMetadata()).toEqual({
            isAsyncStorageReady: false,
          });

          setMetadata({
            isAsyncStorageReady: true,
          });

          expect(getMetadata()).toEqual({
            isAsyncStorageReady: true,
          });
        },
      },
    });

    expect(onInitSpy).toHaveBeenCalledTimes(1);
  });

  $it('should execute onSubscribed callback every time a subscriber is added', ({ renderHook, strict }) => {
    // expect.assertions(18);

    const onSubscribedSpy = jest.fn();

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
      },
    );

    expect(onSubscribedSpy).toHaveBeenCalledTimes(0);

    renderHook(() => store.use());

    expect(onSubscribedSpy).toHaveBeenCalledTimes(strict ? 2 : 1);

    renderHook(() => store.use());
    renderHook(() => store.use());

    expect(onSubscribedSpy).toHaveBeenCalledTimes(strict ? 6 : 3);
  });

  $it('should execute onStateChanged callback every time the state is changed', () => {
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
      },
    );

    expect(onStateChangedSpy).toHaveBeenCalledTimes(0);

    store.setState((state) => ({ count: state.count + 1 }));

    expect(onStateChangedSpy).toHaveBeenCalledTimes(1);
  });

  $it(
    'should execute computePreventStateChange callback before state is changed and continue if it returns false',
    () => {
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
        },
      );

      expect(computePreventStateChangeSpy).toHaveBeenCalledTimes(0);

      store.setState((state) => ({ count: state.count + 1 }));

      expect(computePreventStateChangeSpy).toHaveBeenCalledTimes(1);
      expect(store.getState()).toEqual({ count: 1 });
    },
  );

  $it(
    'should execute computePreventStateChange callback before state is changed and prevent state change if it returns true',
    () => {
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
        },
      );

      expect(computePreventStateChangeSpy).toHaveBeenCalledTimes(0);

      store.setState((state) => ({ count: state.count + 1 }));

      expect(computePreventStateChangeSpy).toHaveBeenCalledTimes(1);
      expect(store.getState()).toEqual({ count: 0 });
    },
  );
});

describe('Custom store by using config parameter', () => {
  const getInitialState = () => {
    return new Map([
      [1, { name: 'john' }],
      [2, { name: 'doe' }],
    ]);
  };

  $it('should initialize the store with the initial state where there is no async storage data', async () => {
    const initialState = getInitialState();
    const { fakeAsyncStorage } = getFakeAsyncStorage();

    const onStateChangedSpy = jest.fn();
    const onInitSpy = jest.fn();

    const { promise: mainPromise, ...tools } = createDecoupledPromise();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let store: GlobalStore<any, any, any>;

    setTimeout(async () => {
      await new CancelablePromise<void>((resolve) => {
        store = new GlobalStore(initialState, {
          metadata: {
            isAsyncStorageReady: false,
          },
          callbacks: {
            onInit: async (parameters) => {
              onInitSpy();

              const { setMetadata, setState } = parameters;

              const stored = (await fakeAsyncStorage.getItem('items')) ?? null;

              setMetadata({
                isAsyncStorageReady: true,
              });

              if (!stored) {
                resolve();

                return;
              }

              const items = formatFromStore(stored) as Map<number, { name: string }>;

              setState(items);
              resolve();
            },
            onStateChanged: ({ getState }) => {
              onStateChangedSpy();

              const newState = getState();

              fakeAsyncStorage.setItem('items', formatToStore(newState));
            },
          },
        });
      });

      expect(onInitSpy).toHaveBeenCalledTimes(1);
      expect(onStateChangedSpy).toHaveBeenCalledTimes(0);
      expect(fakeAsyncStorage.getItem).toHaveBeenCalledTimes(1);
      expect(store.getState()).toEqual(initialState);

      tools.resolve();
    }, 0);

    return mainPromise;
  });

  $it(
    'should initialize the store with the async storage data where there is async storage data',
    async () => {
      const initialState = getInitialState();
      const { fakeAsyncStorage } = getFakeAsyncStorage();
      const onStateChangedSpy = jest.fn();
      const onInitSpy = jest.fn();

      const { promise: mainPromise, ...tools } = createDecoupledPromise();

      const storedMap = new Map(initialState);
      storedMap.set(3, { name: 'jane' });

      fakeAsyncStorage.setItem('items', formatToStore(storedMap));

      setTimeout(async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let store!: GlobalStore<any, any, any>;

        await new CancelablePromise<void>((resolve) => {
          store = new GlobalStore(initialState, {
            metadata: {
              isAsyncStorageReady: false,
            },
            callbacks: {
              onInit: async (parameters) => {
                onInitSpy();

                const { setMetadata, setState } = parameters;

                const stored = (await fakeAsyncStorage.getItem('items')) ?? null;

                setMetadata({
                  isAsyncStorageReady: true,
                });

                if (!stored) {
                  resolve();

                  return;
                }

                const items = formatFromStore(stored) as Map<number, { name: string }>;

                setState(items);
                resolve();
              },
              onStateChanged: ({ getState }) => {
                onStateChangedSpy();

                const newState = getState();

                fakeAsyncStorage.setItem('items', formatToStore(newState));
              },
            },
          });
        });

        expect(onInitSpy).toHaveBeenCalledTimes(1);
        expect(onStateChangedSpy).toHaveBeenCalledTimes(1);
        expect(fakeAsyncStorage.getItem).toHaveBeenCalledTimes(1);

        expect(store.getState()).toEqual(storedMap);

        tools.resolve();
      }, 0);

      return mainPromise;
    },
  );

  $it('should be able to update the store async storage', async ({ renderHook }) => {
    const initialState = getInitialState();
    const { fakeAsyncStorage } = getFakeAsyncStorage();

    const { promise: mainPromise, ...tools } = createDecoupledPromise();
    const { promise: onStateChangedPromise, ...toolsOnStateChangedPromise } = createDecoupledPromise();

    setTimeout(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let store!: GlobalStore<any, any, {}>;

      await new CancelablePromise<void>((resolve) => {
        store = new GlobalStore(initialState, {
          metadata: {
            isAsyncStorageReady: false,
          },
          callbacks: {
            onInit: async (parameters) => {
              const { setMetadata, setState } = parameters;
              const stored = (await fakeAsyncStorage.getItem('items')) ?? null;

              setMetadata({
                isAsyncStorageReady: true as false,
              });

              if (!stored) {
                resolve();

                return;
              }

              const items = formatFromStore(stored) as Map<number, { name: string }>;

              setState(items);
              resolve();
            },
            onStateChanged: async ({ getState }) => {
              const newState = getState();

              await fakeAsyncStorage.setItem('items', formatToStore(newState));

              toolsOnStateChangedPromise.resolve();
            },
          },
        });
      });

      const { result } = renderHook(() => store.use());
      const [, setState] = result.current;

      const newState = new Map(store.getState());
      newState.set(3, { name: 'jane' });

      act(() => {
        setState(newState);
      });

      expect(fakeAsyncStorage.getItem).toHaveBeenCalledTimes(1);
      expect(store.getState()).toEqual(newState);

      await onStateChangedPromise;

      const stored = await fakeAsyncStorage.getItem('items');

      expect(stored).toEqual(
        '{"$t":"map","$v":[[1,{"name":"john"}],[2,{"name":"doe"}],[3,{"name":"jane"}]]}',
      );

      tools.resolve();
    }, 0);

    return mainPromise;
  });
});

describe('GlobalStore Accessing custom actions from other actions', () => {
  $it('should be able to access custom actions from other actions', () => {
    expect.assertions(8);

    const logSpy = jest.fn();

    const store = createCountStoreWithActions(logSpy);

    expect(store.getState()).toEqual(1);
    expect(logSpy).toHaveBeenCalledTimes(0);

    store.actions.increase();

    expect(store.getState()).toEqual(2);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toBeCalledWith('increase');

    store.actions.decrease();

    expect(store.getState()).toEqual(1);
    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toBeCalledWith('decrease');
  });
});
