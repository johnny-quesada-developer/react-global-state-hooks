import {
  formatToStore,
  Subscribe,
  SubscriberCallback,
  GlobalStore,
  createGlobalState,
  createGlobalStateWithDecoupledFuncs,
} from '../src/';

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

    const [getState] = storage.getHookDecoupled();

    const onStateChanged = (storage as any).onStateChanged;
    onStateChanged.bind(storage);

    jest
      .spyOn(storage, 'onStateChanged' as any)
      .mockImplementation((...parameters) => {
        onStateChanged(...parameters);
      });

    expect(storage).toBeInstanceOf(GlobalStore);

    // add a subscriber to the store
    storage.getHook()();

    const [[setter]] = storage.subscribers;
    const setState = jest.fn(setter);

    storage.subscribers = new Map([[setState, {}]]);

    // local storage is synchronous so there are no extra calls to setState when initializing the store
    expect(setState).toBeCalledTimes(0);

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

    let [data, setData] = useData();

    [data, setData] = useData();

    expect(data).toEqual(new Map([['prop', 0]]));

    setData((data) => {
      data.set('prop', 1);

      return data;
    });

    const [data2] = useData();

    expect(data).toBe(data2);
  });
});

describe('getter subscriptions custom global state', () => {
  it('should subscribe to changes from getter', () => {
    const [_, getter, setter] = createGlobalStateWithDecoupledFuncs({
      a: 3,
      b: 2,
    });

    const state = getter();

    // without a callback, it should return the current state
    expect(state).toEqual({
      a: 3,
      b: 2,
    });

    const subscriptionSpy = jest.fn();
    const subscriptionDerivateSpy = jest.fn();

    const callback = jest.fn(((subscribe) => {
      subscribe((state) => {
        subscriptionSpy(state);
      });

      subscribe(
        (state) => {
          return state.a;
        },
        (derivate) => {
          subscriptionDerivateSpy(derivate);
        }
      );
    }) as SubscriberCallback<typeof state>);

    const removeSubscription = getter<Subscribe>(callback);

    expect(subscriptionSpy).toBeCalledTimes(1);
    expect(subscriptionSpy).toBeCalledWith(state);

    expect(subscriptionDerivateSpy).toBeCalledTimes(1);
    expect(subscriptionDerivateSpy).toBeCalledWith(3);

    setter((state) => ({
      ...state,
      b: 3,
    }));

    expect(subscriptionSpy).toBeCalledTimes(2);
    expect(subscriptionSpy).toBeCalledWith({
      a: 3,
      b: 3,
    });

    // the derivate should not be called since it didn't change
    expect(subscriptionDerivateSpy).toBeCalledTimes(1);

    removeSubscription();

    setter((state) => ({
      ...state,
      a: 4,
    }));

    // the subscription should not be called since it was removed
    expect(subscriptionSpy).toBeCalledTimes(2);
    expect(subscriptionDerivateSpy).toBeCalledTimes(1);
  });
});
