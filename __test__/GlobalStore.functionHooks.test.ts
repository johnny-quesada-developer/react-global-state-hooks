import { createDecoupledPromise } from 'easy-cancelable-promise';
import formatFromStore from 'json-storage-formatter/formatFromStore';
import formatToStore from 'json-storage-formatter/formatToStore';
// import { type StoreTools, createGlobalState } from '../src';
import { type StoreTools, createGlobalState } from '..';
import { act } from '@testing-library/react';
import it from './$it';

describe('basic', () => {
  it('should be able to create a new instance with state', ({ renderHook }) => {
    const stateValue = 'test';
    const useValue = createGlobalState(stateValue, {
      metadata: {
        test: true,
      },
      callbacks: {
        onInit: () => {},
      },
    });

    const { result, rerender } = renderHook(() => useValue());
    let [state, setState, metadata] = result.current;

    expect(useValue).toBeInstanceOf(Function);
    expect(state).toBe(stateValue);
    expect(setState).toBeInstanceOf(Function);
    expect(metadata.test).toBe(true);

    act(() => {
      setState('test2');
    });

    rerender();

    [state, setState, metadata] = result.current;

    expect(state).toBe('test2');

    act(() => {
      setState((current) => current + 1);
    });

    rerender();

    [state, setState, metadata] = result.current;

    expect(state).toBe('test21');
  });
});

describe('with actions', () => {
  it('should be able to create a new instance with state and actions, setter should be and object', ({
    renderHook,
  }) => {
    const useCount = createGlobalState(1, {
      metadata: {
        modificationsCounter: 0,
      },
      actions: {
        logModification() {
          return ({ setMetadata }) => {
            setMetadata(({ modificationsCounter, ...metadata }) => ({
              ...metadata,
              modificationsCounter: modificationsCounter + 1,
            }));
          };
        },

        increase(increase: number = 1) {
          return ({ setState, getState, actions }) => {
            setState((state) => state + increase);

            actions.logModification();

            return getState();
          };
        },

        decrease(decrease: number = 1) {
          return ({ setState, getState, actions }) => {
            setState((state) => state - decrease);

            actions.logModification();

            return getState();
          };
        },
      },
    });

    const { result, rerender } = renderHook(() => useCount());
    let [state, actions, metadata] = result.current;

    expect(useCount).toBeInstanceOf(Function);
    expect(metadata.modificationsCounter).toBe(0);

    expect(actions).toBeInstanceOf(Object);
    expect(actions.decrease).toBeInstanceOf(Function);
    expect(actions.increase).toBeInstanceOf(Function);

    expect(state).toBe(1);
    expect(metadata).toEqual({
      modificationsCounter: 0,
    });

    act(() => {
      actions.increase();
      actions.increase(2);
    });

    rerender();
    [state, actions, metadata] = result.current;

    expect(state).toBe(4);
    expect(metadata).toEqual({
      modificationsCounter: 2,
    });

    act(() => {
      actions.decrease();
      actions.decrease(2);
    });

    rerender();
    [state, actions, metadata] = result.current;

    expect(state).toBe(1);
    expect(metadata).toEqual({
      modificationsCounter: 4,
    });
  });
});

describe('with configuration callbacks', () => {
  it('should execute onInit callback', ({ renderHook }) => {
    const onInitSpy = jest.fn(({ setMetadata }) => {
      setMetadata({
        test: true,
      });
    });

    const useCount = createGlobalState(1, {
      callbacks: {
        onInit: onInitSpy,
      },
    });

    expect(onInitSpy).toHaveBeenCalledTimes(1);

    const { result } = renderHook(() => useCount());
    const [state, setState, metadata] = result.current;

    expect(state).toBe(1);
    expect(setState).toBeInstanceOf(Function);
    expect(metadata).toEqual({
      test: true,
    });
  });

  it('should execute onSubscribed callback every time a subscriber is added', ({ renderHook, strict }) => {
    const onSubscribedSpy = jest.fn();

    const useCount = createGlobalState(
      {
        test: new Date(),
      },
      {
        callbacks: {
          onSubscribed: onSubscribedSpy,
        },
      },
    );

    expect(onSubscribedSpy).toHaveBeenCalledTimes(0);

    const { result } = renderHook(() => useCount());
    const [state] = result.current;

    expect(onSubscribedSpy).toHaveBeenCalledTimes(strict ? 2 : 1);

    const { result: result2 } = renderHook(() => useCount());
    const [state2] = result2.current;

    expect(onSubscribedSpy).toHaveBeenCalledTimes(strict ? 4 : 2);

    expect(state).toBe(state2);
  });

  it('should execute onStateChanged callback every time the state is changed', ({ renderHook }) => {
    const onStateChangedSpy = jest.fn();

    const useCount = createGlobalState(
      { a: true },
      {
        callbacks: {
          onStateChanged: onStateChangedSpy,
        },
      },
    );

    expect(onStateChangedSpy).toHaveBeenCalledTimes(0);

    const { result } = renderHook(() => useCount());
    const [, setState] = result.current;

    act(() => {
      setState({ a: true });
    });

    expect(onStateChangedSpy).toHaveBeenCalledTimes(1);

    act(() => {
      setState({ a: false });
    });

    expect(onStateChangedSpy).toHaveBeenCalledTimes(2);
  });

  it('should execute computePreventStateChange callback before state is changed and continue if it returns false', ({
    renderHook,
  }) => {
    const computePreventStateChangeSpy = jest.fn();

    const useCount = createGlobalState(0, {
      callbacks: {
        computePreventStateChange: computePreventStateChangeSpy,
      },
    });

    expect(computePreventStateChangeSpy).toHaveBeenCalledTimes(0);

    const { result } = renderHook(() => useCount());
    const [state, setState, metadata] = result.current;

    expect(state).toEqual(0);
    expect(setState).toBeInstanceOf(Function);
    expect(metadata).toEqual({});

    act(() => {
      setState((state) => state + 1);
    });

    expect(computePreventStateChangeSpy).toHaveBeenCalledTimes(1);
  });

  it('should execute computePreventStateChange callback before state is changed and prevent state change if it returns true', ({
    renderHook,
  }) => {
    const computePreventStateChangeSpy = jest.fn();

    const useCount = createGlobalState(0, {
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
    });

    expect(computePreventStateChangeSpy).toHaveBeenCalledTimes(0);

    const { result } = renderHook(() => useCount());
    const [state, setState, metadata] = result.current;

    expect(state).toEqual(0);
    expect(setState).toBeInstanceOf(Function);
    expect(metadata).toEqual({});

    act(() => {
      setState((state) => state + 1);
    });

    expect(computePreventStateChangeSpy).toHaveBeenCalledTimes(1);
    expect(state).toEqual(0);
  });
});

describe('custom global hooks', () => {
  const getInitialState = () => {
    return new Map([
      [1, { name: 'john' }],
      [2, { name: 'doe' }],
    ]);
  };

  it('should initialize the store with the initial state where there is no  storage data', ({
    renderHook,
  }) => {
    const { localStorage } = globalThis;

    const { promise: mainPromise, ...tools } = createDecoupledPromise();

    const onStateChangedSpy = jest.fn(({ getState }) => {
      const newState = getState();

      localStorage.setItem('items', formatToStore(newState));
    });

    const onInitSpy = jest.fn(
      ({ setState }: { setState: React.Dispatch<React.SetStateAction<Map<number, string>>> }) => {
        const stored = localStorage.getItem('items') ?? null;

        if (stored) return;

        // @ts-expect-error TS2345 - the function receives the forUpdate but we don't want that typed
        setState((state) => state, {
          forceUpdate: true,
        });

        tools.resolve();

        return;
      },
    );

    const initialState = new Map<number, string>();

    const useCount = createGlobalState(initialState, {
      callbacks: {
        onStateChanged: onStateChangedSpy,
        onInit: onInitSpy,
      },
    });

    let { result } = renderHook(() => useCount());
    let [state, setState, metadata] = result.current;

    expect.assertions(4);

    expect(state).toEqual(initialState);
    expect(setState).toBeInstanceOf(Function);
    expect(metadata).toEqual({});

    return mainPromise.then(() => {
      result = renderHook(() => useCount()).result;
      [state, setState, metadata] = result.current;

      expect(state).toEqual(initialState);
    });
  });

  it('should initialize the store with the  storage data where there is  storage data', ({ renderHook }) => {
    const initialState = getInitialState();
    const { localStorage } = globalThis;

    localStorage.setItem('items', formatToStore(initialState));

    const { promise: mainPromise, ...tools } = createDecoupledPromise();

    const onStateChangedSpy = jest.fn(({ getState }) => {
      const newState = getState();

      localStorage.setItem('items', formatToStore(newState));
    });

    const onInitSpy = jest.fn(({ setState }) => {
      const stored = localStorage.getItem('items') ?? null;

      if (!stored) return;

      setState(formatFromStore(stored), {
        forceUpdate: true,
      });

      tools.resolve();
    });

    const useCount = createGlobalState(initialState, {
      callbacks: {
        onStateChanged: onStateChangedSpy,
        onInit: onInitSpy,
      },
    });

    let { result } = renderHook(() => useCount());
    let [state, setState, metadata] = result.current;

    expect(state).toEqual(initialState);
    expect(setState).toBeInstanceOf(Function);
    expect(metadata).toEqual({});

    return mainPromise.then(() => {
      result = renderHook(() => useCount()).result;
      [state, setState, metadata] = result.current;

      expect(state).toEqual(
        new Map([
          [1, { name: 'john' }],
          [2, { name: 'doe' }],
        ]),
      );

      expect(onStateChangedSpy).toHaveBeenCalledTimes(1);
      expect(onInitSpy).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem('items')).toEqual(formatToStore(initialState));
    });
  });

  it('should be able to update the store  storage', ({ renderHook }) => {
    const initialState = getInitialState();
    const { localStorage } = globalThis;

    const { promise: mainPromise, ...tools } = createDecoupledPromise();

    const onStateChangedSpy = jest.fn(({ getState }) => {
      const newState = getState();

      localStorage.setItem('items', formatToStore(newState));

      tools.resolve();
    });

    const onInitSpy = jest.fn(({ setState }: StoreTools<Map<number, { name: string }>>) => {
      const stored = localStorage.getItem('items') ?? null;

      if (stored) return;

      // @ts-expect-error TS2345 - the function receives the forUpdate but we don't want that typed
      setState((state) => state, {
        forceUpdate: true,
      });
    });

    const useCount = createGlobalState(initialState, {
      callbacks: {
        onStateChanged: onStateChangedSpy,
        onInit: onInitSpy,
      },
    });

    let { result } = renderHook(() => useCount());
    let [state, setState, metadata] = result.current;

    expect(state).toEqual(initialState);
    expect(setState).toBeInstanceOf(Function);
    expect(metadata).toEqual({});

    return mainPromise.then(() => {
      result = renderHook(() => useCount()).result;
      [state, setState, metadata] = result.current;

      expect(state).toBe(initialState);

      expect(onStateChangedSpy).toHaveBeenCalledTimes(1);
      expect(onInitSpy).toHaveBeenCalledTimes(1);

      expect(localStorage.getItem('items')).toEqual(formatToStore(initialState));
    });
  });

  it('should be able to access custom actions from other actions', ({ renderHook }) => {
    expect.assertions(9);

    const logSpy = jest.fn();

    const useCount = createGlobalState(1, {
      metadata: {
        test: true,
      },
      actions: {
        log: (message: string) => {
          return () => {
            logSpy(message);
          };
        },
        increase: () => {
          return ({ setState }) => {
            setState((state) => state + 1);

            useCount.actions.log('increase');
          };
        },
        decrease: () => {
          return ({ setState }) => {
            setState((state) => state - 1);

            useCount.actions.log('decrease');
          };
        },
      },
    });

    const { result } = renderHook(() => useCount());
    const [state, actions] = result.current;

    expect(state).toEqual(1);
    expect(logSpy).toHaveBeenCalledTimes(0);

    act(() => {
      actions.increase();
    });

    expect(useCount.getState()).toEqual(2);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith('increase');

    act(() => {
      actions.decrease();
    });

    expect(useCount.getState()).toEqual(1);
    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenCalledWith('decrease');

    act(() => {
      useCount.actions.increase();
    });

    const count = useCount.getState();

    expect(count).toEqual(2);
  });

  it('should derivate new state from global', ({ renderHook, strict }) => {
    const useCount = createGlobalState({
      a: 1,
      b: 2,
    });

    const selector = jest.fn((state: { a: number; b: number }) => state.a + state.b);

    const { result } = renderHook(() => useCount());
    const [state, setState] = result.current;

    expect(state).toEqual({
      a: 1,
      b: 2,
    });

    act(() => {
      setState((state) => ({
        ...state,
        a: 2,
      }));
    });

    const { result: result2 } = renderHook(() => useCount(selector));
    const [derivate2] = result2.current;
    expect(selector).toHaveBeenCalledTimes(strict ? 2 : 1);

    expect(derivate2).toEqual(4);
  });

  it('should avoid derivate to re-render due to shallow equal', ({ renderHook }) => {
    const useData = createGlobalState({
      a: 1,
      b: 2,
      c: [1, 2, { a: 1 }],
    });

    const selector = jest.fn(({ a, c }: { a: number; c: unknown[] }) => ({
      a,
      c,
    }));

    const { result } = renderHook(() => useData(selector));
    const [derivate, setState] = result.current;

    expect(derivate).toEqual({
      a: 1,
      c: [1, 2, { a: 1 }],
    });

    act(() => {
      setState((state) => ({
        ...state,
        b: 3,
      }));
    });

    const { result: result2 } = renderHook(() => useData(selector));
    const [derivate2, setState2] = result2.current;

    // there should be just two calls to useState since the derivate didn't change
    expect(derivate2).toEqual({
      a: 1,
      c: [1, 2, { a: 1 }],
    });

    const { result: result3 } = renderHook(() => useData());
    const [data] = result3.current;

    expect(data).toEqual({
      a: 1,
      b: 3,
      c: [1, 2, { a: 1 }],
    });

    act(() => {
      setState2((state) => ({
        ...state,
        b: 4,
      }));
    });

    const { result: result4 } = renderHook(() => useData(selector));
    const [data1] = result4.current;

    expect(data1).toEqual({
      a: 1,
      c: [1, 2, { a: 1 }],
    });
  });
});

describe('getter subscriptions', () => {
  it('should subscribe to changes from getter', () => {
    const useState = createGlobalState({
      a: 3,
      b: 2,
    });

    const state = useState.getState();

    // without a callback, it should return the current state
    expect(state).toEqual({
      a: 3,
      b: 2,
    });

    const subscriptionSpy = jest.fn();
    const subscriptionDerivateSpy = jest.fn();

    const subscriptions = [
      useState.subscribe((state) => {
        subscriptionSpy(state);
      }),

      useState.subscribe(
        (state) => {
          return state.a;
        },
        (derivate) => {
          subscriptionDerivateSpy(derivate);
        },
      ),
    ];

    expect(subscriptionSpy).toHaveBeenCalledTimes(1);
    expect(subscriptionSpy).toHaveBeenCalledWith(state);

    expect(subscriptionDerivateSpy).toHaveBeenCalledTimes(1);
    expect(subscriptionDerivateSpy).toHaveBeenCalledWith(3);

    act(() => {
      useState.setState((state) => ({
        ...state,
        b: 3,
      }));
    });

    expect(subscriptionSpy).toHaveBeenCalledTimes(2);
    expect(subscriptionSpy).toHaveBeenCalledWith({
      a: 3,
      b: 3,
    });

    // the derivate should not be called since it didn't change
    expect(subscriptionDerivateSpy).toHaveBeenCalledTimes(1);

    subscriptions.forEach((unsubscribe) => unsubscribe());

    act(() => {
      useState.setState((state) => ({
        ...state,
        a: 4,
      }));
    });

    // the subscription should not be called since it was removed
    expect(subscriptionSpy).toHaveBeenCalledTimes(2);
    expect(subscriptionDerivateSpy).toHaveBeenCalledTimes(1);
  });
});

describe('create fragment', () => {
  it('should create a fragment as a hook', ({ renderHook }) => {
    const initialState = {
      a: 1,
      b: 2,
      c: 3 as number | null,
    };

    const useData = createGlobalState(initialState);

    expect(useData).toBeInstanceOf(Function);
    expect(useData.getState).toBeInstanceOf(Function);
    expect(useData.setState).toBeInstanceOf(Function);

    expect(useData.getState()).toBe(initialState);

    const useDerivate = useData.createSelectorHook(({ a, b }) => {
      return {
        a,
        b,
      };
    });

    const { result } = renderHook(() => useDerivate());
    const derivate = result.current;

    const useSub = useData.createSelectorHook(({ a }) => {
      return a;
    });

    const { result: result2 } = renderHook(() => useSub());
    const sub = result2.current;

    expect(derivate).toEqual({
      a: 1,
      b: 2,
    });

    expect(sub).toBe(1);

    act(() => {
      useData.setState((state) => ({
        ...state,
        c: null,
        a: 12,
      }));
    });

    const { result: result3 } = renderHook(() => useDerivate());
    const derivate2 = result3.current;

    expect(derivate2).toEqual({
      a: 12,
      b: 2,
    });

    const { result: result4 } = renderHook(() => useSub());
    const sub2 = result4.current;

    expect(sub2).toBe(12);
  });

  it('should create a derivate emitter', () => {
    expect.assertions(10);

    const initialState = {
      secondRound: false,
      a: 1,
      b: 2,
      c: 3,
    };

    const useData = createGlobalState(initialState);

    expect(useData).toBeInstanceOf(Function);
    expect(useData.getState).toBeInstanceOf(Function);
    expect(useData.setState).toBeInstanceOf(Function);

    expect(useData.getState()).toBe(initialState);

    const subscribe = useData.createObservable(({ a, b, secondRound }) => {
      return {
        secondRound,
        a,
        b,
      };
    });

    subscribe((derivate) => {
      expect(derivate).toEqual({
        secondRound: derivate.secondRound,
        a: 1,
        b: 2,
      });
    });

    const observable = subscribe.createObservable(({ a, secondRound }) => {
      return {
        secondRound,
        a,
      };
    });

    observable((derivate) => {
      expect(derivate).toEqual({
        secondRound: derivate.secondRound,
        a: 1,
      });
    });

    const observable2 = observable.createObservable(({ a }) => {
      return a;
    });

    observable2((derivate) => {
      expect(derivate).toEqual(1);
    });

    observable2(
      (state) => {
        return `${state}`;
      },
      (derivate) => {
        expect(derivate).toEqual('1');
      },
    );

    act(() => {
      useData.setState((state) => ({
        ...state,
        secondRound: true,
      }));
    });
  });
});
