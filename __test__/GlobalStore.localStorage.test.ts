import { formatToStore } from 'json-storage-formatter/formatToStore';
import { GlobalStore, createGlobalState } from '..';
import { act, renderHook } from '@testing-library/react';

describe('LocalStorage Basics', () => {
  it('should create a store with  storage', () => {
    localStorage.setItem(
      'counter',
      formatToStore(0, {
        stringify: true,
      })
    );

    const storage = new GlobalStore(0, {
      localStorage: {
        key: 'counter',
      },
    });

    const [getState] = storage.stateControls();

    const onStateChanged = (storage as any).onStateChanged;
    onStateChanged.bind(storage);

    jest.spyOn(storage, 'onStateChanged' as any).mockImplementation((...parameters) => {
      onStateChanged(...parameters);
    });

    expect(storage).toBeInstanceOf(GlobalStore);

    // add a subscriber to the store
    renderHook(() => storage.getHook()());

    const [[id, parameters]] = storage.subscribers;
    const { callback } = parameters;
    const callbackWrapper = jest.fn(callback);

    parameters.callback = callbackWrapper;

    storage.subscribers = new Map([[id, parameters]]);

    // local storage is synchronous so there are no extra calls to setState when initializing the store
    expect(callbackWrapper).toHaveBeenCalledTimes(0);

    expect(getState()).toBe(0);

    const storedValue = localStorage.getItem('counter');

    expect(storedValue).toBe('0');
  });
});

describe('createGlobalState', () => {
  it('should create a store with  storage', () => {
    localStorage.setItem(
      'data',
      formatToStore(new Map([['prop', 0]]), {
        stringify: true,
      })
    );

    const useData = createGlobalState(new Map<string, number>(), {
      localStorage: {
        key: 'data',
      },
    });

    const { result } = renderHook(() => useData());
    const [, setData] = result.current;

    const { result: result2 } = renderHook(() => useData());
    const [data2] = result2.current;

    expect(data2).toEqual(new Map([['prop', 0]]));

    act(() => {
      setData((data) => {
        data.set('prop', 1);

        return data;
      });
    });

    const { result: result3 } = renderHook(() => useData());
    const [data3] = result3.current;

    expect(data2).toBe(data3);
  });
});

describe('getter subscriptions custom global state', () => {
  it('should subscribe to changes from getter', () => {
    const [getter, setter] = createGlobalState({
      a: 3,
      b: 2,
    }).stateControls();

    const state = getter();

    // without a callback, it should return the current state
    expect(state).toEqual({
      a: 3,
      b: 2,
    });

    const subscriptionSpy = jest.fn();
    const subscriptionDerivateSpy = jest.fn();

    const subscriptions = [
      getter((state) => {
        subscriptionSpy(state);
      }),

      getter(
        (state) => {
          return state.a;
        },
        (derivate) => {
          subscriptionDerivateSpy(derivate);
        }
      ),
    ];

    expect(subscriptionSpy).toHaveBeenCalledTimes(1);
    expect(subscriptionSpy).toHaveBeenCalledWith(state);

    expect(subscriptionDerivateSpy).toHaveBeenCalledTimes(1);
    expect(subscriptionDerivateSpy).toHaveBeenCalledWith(3);

    setter((state) => ({
      ...state,
      b: 3,
    }));

    expect(subscriptionSpy).toHaveBeenCalledTimes(2);
    expect(subscriptionSpy).toHaveBeenCalledWith({
      a: 3,
      b: 3,
    });

    // the derivate should not be called since it didn't change
    expect(subscriptionDerivateSpy).toHaveBeenCalledTimes(1);

    subscriptions.forEach((unsubscribe) => unsubscribe());

    setter((state) => ({
      ...state,
      a: 4,
    }));

    // the subscription should not be called since it was removed
    expect(subscriptionSpy).toHaveBeenCalledTimes(2);
    expect(subscriptionDerivateSpy).toHaveBeenCalledTimes(1);
  });
});
