import formatFromStore from 'json-storage-formatter/formatFromStore';
import formatToStore from 'json-storage-formatter/formatToStore';
import { GlobalStore, type ActionCollectionConfig, type ActionCollectionResult, type StoreTools } from '..';
// import {
//   GlobalStore,
//   type ActionCollectionConfig,
//   type ActionCollectionResult,
//   type StoreTools,
// } from '../src';
import { act } from '@testing-library/react';
import it from './$it';
import { isMap, isSet } from 'react-hooks-global-states/shallowCompare';
import { ItemEnvelope } from '../src/types';

describe('GlobalStore Basic', () => {
  it('should be able to create a new instance with state', () => {
    const stateValue = 'test';

    const store = new GlobalStore(stateValue, {
      localStorage: {
        key: 'key1',
        validator: ({ restored, initial }) => {
          if (typeof restored !== 'string') {
            return initial;
          }

          return restored;
        },
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
        validator: ({ restored, initial }) => {
          if (typeof restored !== 'string') {
            return initial;
          }

          return restored;
        },
      },
    });

    expect(store.setState).toBeInstanceOf(Function);
  });

  it('should be able to get the state', () => {
    const stateValue = 1;

    const store = new GlobalStore(stateValue, {
      localStorage: {
        key: 'key1',
        validator: ({ restored, initial }) => {
          if (typeof restored !== 'number') {
            return initial;
          }

          return restored;
        },
      },
    });

    expect(store.getState()).toBe(stateValue);
  });

  it('should be able to set the state', () => {
    const stateValue = 'test';

    const store = new GlobalStore(stateValue, {
      localStorage: {
        key: 'key1',
        validator: ({ restored, initial }) => {
          if (typeof restored !== 'string') {
            return initial;
          }

          return restored;
        },
      },
    });

    store.setState('test2');

    expect(store.getState()).toBe('test2');
  });

  it('should notify initialize all subscribers of the store', ({ renderHook }) => {
    const stateValue = 'test';
    const stateValue2 = 'test2';

    const store = new GlobalStore(stateValue, {
      localStorage: {
        key: 'key1',
        validator: ({ restored, initial }) => {
          if (typeof restored !== 'string') {
            return initial;
          }

          return restored;
        },
      },
    });

    renderHook(() => store.use());
    renderHook(() => store.use());

    const [subscriber1, subscriber2] = store.subscribers;
    jest.spyOn(subscriber1, 'onStoreChange');
    jest.spyOn(subscriber2, 'onStoreChange');

    act(() => {
      store.setState(stateValue2);
    });

    expect(store.getState()).toBe(stateValue2);
    expect(subscriber1.onStoreChange).toHaveBeenCalledTimes(1);
    expect(subscriber2.onStoreChange).toHaveBeenCalledTimes(1);
  });
});

describe('GlobalStore Persistence', () => {
  it('should be able to persist the state', () => {
    const stateValue = 'test';

    const envelope: ItemEnvelope<string> = {
      s: stateValue,
      v: -1,
    };

    const store = new GlobalStore(stateValue, {
      localStorage: {
        key: 'key1',
        validator: ({ restored, initial }) => {
          if (typeof restored !== 'string') {
            return initial;
          }

          return restored;
        },
      },
    });

    expect(store.getState()).toBe(stateValue);
    expect(localStorage.getItem('key1')).toBe(JSON.stringify(envelope));
  });

  it('should be able to restore the state', () => {
    jest.spyOn(localStorage, 'getItem');

    const envelope: ItemEnvelope<string> = {
      s: 'test',
      v: 1,
    };

    localStorage.setItem('key1', formatToStore(envelope));

    const store = new GlobalStore('', {
      localStorage: {
        key: 'key1',
        validator: ({ restored, initial }) => {
          if (typeof restored !== 'string') {
            return initial;
          }

          return restored;
        },
      },
    });

    expect(store.getState()).toBe('test');
    expect(JSON.parse(localStorage.getItem('key1')!).s).toEqual('test');
  });

  it('should be able to restore state type Set', () => {
    const stateValue = new Set(['test', 'test2']);

    const storedEnvelope: ItemEnvelope<Set<string>> = {
      s: stateValue,
      v: 1,
    };

    localStorage.setItem('key1', formatToStore(storedEnvelope));

    new GlobalStore(null as unknown as Set<string>, {
      localStorage: {
        key: 'key1',
        validator: ({ restored, initial }) => {
          if (isSet(restored)) {
            return restored as typeof initial;
          }

          return new Set(initial);
        },
      },
    });

    const storedItem = localStorage.getItem('key1');
    const jsonParsed = storedItem as string;

    const restoredState = formatFromStoreWithEnvelope(jsonParsed);

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
        validator: ({ restored, initial }) => {
          if (isMap(restored)) {
            return restored as typeof initial;
          }

          return initial;
        },
      },
    });

    const storedItem = localStorage.getItem('key1');
    const jsonParsed = storedItem as string;

    const restoredState = formatFromStoreWithEnvelope(jsonParsed);

    expect(restoredState).toBeInstanceOf(Map);
    expect(restoredState).toEqual(stateValue);
  });

  it('should be able to restore state type Date', () => {
    const stateValue = new Date();

    const storedEnvelope: ItemEnvelope<Date> = {
      s: stateValue,
      v: 1,
    };

    localStorage.setItem('key1', formatToStore(storedEnvelope));

    new GlobalStore(null as unknown as Date, {
      localStorage: {
        key: 'key1',
        validator: ({ restored, initial }) => {
          if (!(restored instanceof Date)) {
            return initial;
          }

          return restored;
        },
      },
    });

    const storedItem = localStorage.getItem('key1');
    const jsonParsed = storedItem as string;

    const restoredState = formatFromStoreWithEnvelope(jsonParsed);

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
    state: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    actionsConfig: ActionCollectionConfig<number, any>;
    getStoreActionsMap: (param: { invokerSetState?: React.Dispatch<React.SetStateAction<number>> }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      actions: ActionCollectionResult<number, any, ActionCollectionConfig<number, any>>;
      storeTools: StoreTools<number>;
    };
  };
};

describe('GlobalStore Basic', () => {
  it('should be able to create a new instance with state', () => {
    const stateValue = 'test';
    const store = new GlobalStore(stateValue);

    expect(store).toBeInstanceOf(GlobalStore);
    expect(store.state).toBe(stateValue);
  });

  it('state setter should be a function', () => {
    const stateValue = 'test';
    const store = new GlobalStore(stateValue);

    expect(store.setState).toBeInstanceOf(Function);
  });

  it('should be able to get the state', () => {
    const stateValue = 1;

    const store = new GlobalStore(stateValue, {
      localStorage: {
        key: 'key',
        validator: ({ restored, initial }) => {
          if (typeof restored !== 'number') {
            return initial;
          }

          return restored;
        },
      },
    });

    expect(store.getState()).toBe(stateValue);
  });

  it('should be able to set the state', () => {
    const stateValue = 'test';
    const store = new GlobalStore(stateValue);

    store.setState('test2');

    expect(store.state).toBe('test2');
  });

  it('should be able to set the state with a function', () => {
    const stateValue = 'test';
    const store = new GlobalStore(stateValue);

    store.setState((state) => `${state}2`);

    expect(store.state).toBe('test2');
  });

  it('should notify initialize all subscribers of the store', ({ renderHook }) => {
    const stateValue = 'test';
    const stateValue2 = 'test2';

    const store = new GlobalStore(stateValue);

    renderHook(() => store.use());
    renderHook(() => store.use());

    const [subscriber1, subscriber2] = store.subscribers;
    jest.spyOn(subscriber1, 'onStoreChange');
    jest.spyOn(subscriber2, 'onStoreChange');

    act(() => {
      store.setState(stateValue2);
    });

    expect(store.getState()).toBe(stateValue2);
    expect(subscriber1.onStoreChange).toHaveBeenCalledTimes(1);
    expect(subscriber2.onStoreChange).toHaveBeenCalledTimes(1);
  });
});

describe('GlobalStore with actions', () => {
  it('should be able to create a new instance with state and actions, setter should be and object', () => {
    const store = createCountStoreWithActions();

    expect(store).toBeInstanceOf(GlobalStore);
    expect(store.state).toBe(countStoreInitialState);
    expect(store.actionsConfig).toBeDefined();

    const { actions, storeTools } = store.getStoreActionsMap({});

    expect(actions).not.toBeInstanceOf(Function);
    expect(actions.increase).toBeDefined();
    expect(storeTools).toBeDefined();
  });

  it('should be able to get the state', () => {
    const store = createCountStoreWithActions();

    expect(store.getState()).toBe(countStoreInitialState);
  });

  it('should be able to set the state', () => {
    const store = createCountStoreWithActions();

    store.actions.increase();

    expect(store.getState()).toBe(2);
  });

  it('should initialize all subscribers of the store', ({ renderHook }) => {
    const store = createCountStoreWithActions();

    renderHook(() => store.use());
    renderHook(() => store.use());

    const [subscriber1, subscriber2] = store.subscribers;
    jest.spyOn(subscriber1, 'onStoreChange');
    jest.spyOn(subscriber2, 'onStoreChange');

    expect(store.getState()).toBe(countStoreInitialState);
    expect(subscriber1.onStoreChange).toHaveBeenCalledTimes(0);
    expect(subscriber2.onStoreChange).toHaveBeenCalledTimes(0);
  });

  it('should update all subscribers of the store', ({ renderHook }) => {
    const store = createCountStoreWithActions();

    renderHook(() => store.use());
    renderHook(() => store.use());

    const [subscriber1, subscriber2] = store.subscribers;
    jest.spyOn(subscriber1, 'onStoreChange');
    jest.spyOn(subscriber2, 'onStoreChange');

    act(() => {
      store.actions.increase();
    });

    expect(store.getState()).toBe(2);
    expect(subscriber1.onStoreChange).toHaveBeenCalledTimes(1);
    expect(subscriber2.onStoreChange).toHaveBeenCalledTimes(1);
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

  it('should execute onSubscribed callback every time a subscriber is added', ({ renderHook, strict }) => {
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
      },
    );

    expect(onStateChangedSpy).toHaveBeenCalledTimes(0);

    store.setState((state) => ({ count: state.count + 1 }));

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
      },
    );

    expect(computePreventStateChangeSpy).toHaveBeenCalledTimes(0);

    store.setState((state) => ({ count: state.count + 1 }));

    expect(computePreventStateChangeSpy).toHaveBeenCalledTimes(1);
    expect(store.getState()).toEqual({ count: 1 });
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
      },
    );

    expect(computePreventStateChangeSpy).toHaveBeenCalledTimes(0);

    store.setState((state) => ({ count: state.count + 1 }));

    expect(computePreventStateChangeSpy).toHaveBeenCalledTimes(1);
    expect(store.getState()).toEqual({ count: 0 });
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

    const store = new GlobalStore(initialState, {
      callbacks: {
        onInit: (parameters) => {
          onInitSpy();

          const { setState } = parameters;

          const stored = localStorage.getItem('items') ?? null;

          if (!stored) {
            return;
          }

          const items = formatFromStoreWithEnvelope(stored) as Map<number, { name: string }>;

          setState(items);
        },
        onStateChanged: ({ getState }) => {
          onStateChangedSpy();

          const newState = getState();

          localStorage.setItem('items', formatToStoreWithEnvelope(newState));
        },
      },
    });

    expect(onInitSpy).toHaveBeenCalledTimes(1);
    expect(onStateChangedSpy).toHaveBeenCalledTimes(0);
    expect(localStorage.getItem('items')).toBe(null);
    expect(store.getState()).toEqual(initialState);
  });

  it('should initialize the store with the  storage data where there is storage data', () => {
    const initialState = getInitialState();
    const { localStorage } = globalThis;
    const onStateChangedSpy = jest.fn();
    const onInitSpy = jest.fn();
    jest.spyOn(localStorage, 'getItem');

    const storedMap = new Map(initialState);
    storedMap.set(3, { name: 'jane' });

    localStorage.setItem('items', formatToStoreWithEnvelope(storedMap));

    const store = new GlobalStore(initialState, {
      callbacks: {
        onInit: (parameters) => {
          onInitSpy();

          const { setState } = parameters;

          const stored = localStorage.getItem('items') ?? null;

          if (!stored) {
            return;
          }

          const items = formatFromStoreWithEnvelope(stored) as Map<number, { name: string }>;

          setState(items);
        },
        onStateChanged: ({ getState }) => {
          onStateChangedSpy();

          const newState = getState();

          localStorage.setItem('items', formatToStoreWithEnvelope(newState));
        },
      },
    });

    expect(onInitSpy).toHaveBeenCalledTimes(1);
    expect(onStateChangedSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('items')!).s).toEqual({
      $t: 'map',
      $v: [
        [1, { name: 'john' }],
        [2, { name: 'doe' }],
        [3, { name: 'jane' }],
      ],
    });

    expect(store.getState()).toEqual(storedMap);
  });

  it('should be able to update the store  storage', ({ renderHook }) => {
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

          const items = formatFromStoreWithEnvelope(stored) as Map<number, { name: string }>;

          setState(items);
        },
        onStateChanged: ({ getState }) => {
          const newState = getState();

          localStorage.setItem('items', formatToStoreWithEnvelope(newState));
        },
      },
    });

    const { result } = renderHook(() => store.use());
    const [, setState] = result.current;

    const newState = new Map(store.getState());
    newState.set(3, { name: 'jane' });

    act(() => {
      setState(newState);
    });

    expect(JSON.parse(localStorage.getItem('items')!).s).toEqual({
      $t: 'map',
      $v: [
        [1, { name: 'john' }],
        [2, { name: 'doe' }],
        [3, { name: 'jane' }],
      ],
    });

    expect(store.getState()).toEqual(newState);
  });

  it('fallback to initial state when error occurs during restoration from local storage', () => {
    localStorage.setItem('key', '{not json');

    const errorSpy = jest.fn();

    const store = new GlobalStore('init', {
      localStorage: {
        key: 'key',
        validator: ({ restored }) => restored as string,
        onError: errorSpy,
      },
    });

    expect(errorSpy).toHaveBeenCalledWith(expect.any(SyntaxError));
    expect(store.getState()).toBe('init');
  });

  it('normalizes and persists initial state on init read error', () => {
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('IO');
    });

    const store = new GlobalStore(
      { a: 1 },
      {
        localStorage: {
          key: 'k',
          validator: ({ restored }) => ({ ...(restored as { a: number }), norm: true }),
          onError: jest.fn(),
        },
      },
    );

    getItemSpy.mockRestore();

    expect(store.getState()).toEqual({ a: 1, norm: true });
    expect(JSON.parse(localStorage.getItem('k')!)).toEqual({ s: { a: 1, norm: true }, v: -1 });
  });
});

describe('GlobalStore Accessing custom actions from other actions', () => {
  it('should be able to access custom actions from other actions', () => {
    expect.assertions(8);

    const logSpy = jest.fn();

    const store = createCountStoreWithActions(logSpy);

    expect(store.getState()).toEqual(1);
    expect(logSpy).toHaveBeenCalledTimes(0);

    act(() => {
      store.actions.increase();
    });

    expect(store.getState()).toEqual(2);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith('increase');

    act(() => {
      store.actions.decrease();
    });

    expect(store.getState()).toEqual(1);
    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenCalledWith('decrease');
  });
});

function formatToStoreWithEnvelope<State>(state: State) {
  const envelope: ItemEnvelope<State> = {
    s: state,
    v: 1,
  };

  return formatToStore(envelope);
}

function formatFromStoreWithEnvelope<State>(json: string): State {
  const result = formatFromStore<ItemEnvelope<State>>(json);

  return result.s;
}
