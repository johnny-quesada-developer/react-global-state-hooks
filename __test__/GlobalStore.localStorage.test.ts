/* eslint-disable @typescript-eslint/no-unused-vars */
import formatToStore from 'json-storage-formatter/formatToStore';

import { createGlobalState, GlobalStore } from '..';
// import { GlobalStore, createGlobalState } from '../src';
import { act } from '@testing-library/react';
import it from './$it';
import { isMap } from 'react-hooks-global-states/shallowCompare';
import { ItemEnvelope } from '../src/types';
import { formatFromStore } from 'json-storage-formatter';

describe('LocalStorage Basics', () => {
  it('should create a store with  storage', ({ renderHook }) => {
    const envelope: ItemEnvelope<number> = {
      s: 0,
      v: 2,
    };

    localStorage.setItem('counter', formatToStore(envelope));

    const storage = new GlobalStore(0, {
      localStorage: {
        key: 'counter',
        validator: ({ restored, initial }) => {
          if (typeof restored !== 'number') {
            return initial;
          }

          return restored;
        },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onStateChanged = (storage as any).onStateChanged;
    onStateChanged.bind(storage);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(storage, 'onStateChanged' as any).mockImplementation((...parameters) => {
      onStateChanged(...parameters);
    });

    expect(storage).toBeInstanceOf(GlobalStore);

    // add a subscriber to the store
    renderHook(() => storage.use());

    const [parameters] = storage.subscribers;
    const { onStoreChange } = parameters;
    const callbackWrapper = jest.fn(onStoreChange);

    parameters.onStoreChange = callbackWrapper;

    storage.subscribers = new Set([parameters]);

    // local storage is synchronous so there are no extra calls to setState when initializing the store
    expect(callbackWrapper).toHaveBeenCalledTimes(0);

    expect(storage.getState()).toBe(0);

    const storedValue = localStorage.getItem('counter');

    expect(storedValue).toBe('{"s":0,"v":-1}');
  });

  it('should correctly restore local storage using the provided config', () => {
    const value = new Map<unknown, unknown>([
      ['prop', 42],
      [
        1,
        {
          prop: 100,
        },
      ],
    ]);

    const envelope: ItemEnvelope<typeof value> = {
      s: value,
      v: 1,
    };

    localStorage.setItem('mapData', formatToStore(envelope));

    const validatorSpy = jest.fn();

    const storage = new GlobalStore(new Map(), {
      localStorage: {
        key: 'mapData',
        validator: ({ restored, initial }) => {
          validatorSpy({ restored, initial });

          if (isMap(restored)) {
            return restored as typeof initial;
          }

          return initial;
        },
      },
    });

    expect(storage.getState()).toEqual(value);
    expect(validatorSpy).toHaveBeenCalledTimes(1);
    expect(validatorSpy).toHaveBeenCalledWith({ restored: value, initial: new Map() });

    storage.setState((prev) => {
      const newMap = new Map(prev);
      newMap.set('prop', 100);

      return newMap;
    });

    const restored = localStorage.getItem('mapData');
    const parsed = formatFromStore(restored!);

    expect(storage.getState().get('prop')).toBe(100);

    expect(parsed).toEqual({
      s: new Map<unknown, unknown>([
        ['prop', 100],
        [
          1,
          {
            prop: 100,
          },
        ],
      ]),
      v: -1,
    });
  });

  it('should correctly replace value with validator returning initial state', () => {
    const value = new Map<unknown, unknown>([['prop', 42]]);

    const envelope: ItemEnvelope<typeof value> = {
      s: value,
      v: 1,
    };

    localStorage.setItem('mapData', formatToStore(envelope));

    const storage = new GlobalStore(new Map(), {
      localStorage: {
        key: 'mapData',
        validator: () => {
          return new Map([['prop', 'test']]);
        },
      },
    });

    expect(storage.getState()).toEqual(new Map([['prop', 'test']]));
  });

  it("should state be restored if validator doesn't return a value", () => {
    const value = new Map<unknown, unknown>([['prop', 42]]);

    const envelope: ItemEnvelope<typeof value> = {
      s: value,
      v: 1,
    };

    localStorage.setItem('mapData', formatToStore(envelope));

    const storage = new GlobalStore(new Map([[42, 24]]), {
      localStorage: {
        key: 'mapData',
        validator: ({ restored }) => {
          if (!restored) {
            throw new Error('No restored value');
          }
        },
      },
    });

    expect(storage.getState()).toEqual(value);
  });

  it('should correctly restore local storage using the provided config: validator', () => {
    const value = new Map<unknown, unknown>([['prop', 42]]);

    const envelope: ItemEnvelope<typeof value> = {
      s: value,
      v: 1,
    };

    localStorage.setItem('mapData', formatToStore(envelope));

    const validatorSpy = jest.fn();

    const storage = new GlobalStore(new Map(), {
      localStorage: {
        key: 'mapData',
        validator: ({ restored, initial }) => {
          validatorSpy({ restored, initial });

          return initial;
        },
      },
    });

    expect(storage.getState()).toEqual(new Map());

    expect(validatorSpy).toHaveBeenCalledTimes(1);
    expect(validatorSpy).toHaveBeenCalledWith({ restored: value, initial: new Map() });

    // since the validator returned the initial state, the storage should be empty
    expect(storage.getState()).toEqual(new Map());
  });

  it('should correctly trigger migration when versions differ', () => {
    const value = new Map<unknown, unknown>([['#', ['a', 'b', 'c']]]);

    const envelope: ItemEnvelope<typeof value> = {
      s: value,
      v: 1,
    };

    localStorage.setItem('mapData', formatToStore(envelope));

    const migratorSpy = jest.fn();

    const storage = new GlobalStore(new Map(), {
      localStorage: {
        key: 'mapData',
        validator: ({ restored, initial }) => {
          return restored as typeof initial;
        },
        versioning: {
          version: 1,
          migrator: ({ legacy, initial }) => {
            migratorSpy();

            return legacy as typeof initial;
          },
        },
      },
    });

    expect(storage.getState()).toEqual(value);
    expect(migratorSpy).toHaveBeenCalledTimes(0);

    // should trigger migration only when versions differ
    new GlobalStore(new Set(), {
      localStorage: {
        key: 'mapData',
        validator: ({ restored, initial }) => {
          return restored as typeof initial;
        },
        versioning: {
          version: 2,
          migrator: ({ legacy }) => {
            migratorSpy();

            const map = legacy as Map<unknown, unknown>;
            const [first] = [...map.entries()];

            return new Set([...first.values()]);
          },
        },
      },
    });

    new GlobalStore(new Set(), {
      localStorage: {
        key: 'mapData',
        validator: ({ restored, initial }) => {
          return restored as typeof initial;
        },
        versioning: {
          version: 2,

          migrator: () => {
            migratorSpy();

            return new Set();
          },
        },
      },
    });

    expect(migratorSpy).toHaveBeenCalledTimes(1);
  });

  it('should correctly trigger migration when versions differ', () => {
    const value = new Map<unknown, unknown>([['#', ['a', 'b', 'c']]]);

    const envelope: ItemEnvelope<typeof value> = {
      s: value,
      v: 1,
    };

    localStorage.setItem('mapData', formatToStore(envelope));

    const migratorSpy = jest.fn();

    const storage = new GlobalStore(new Map(), {
      localStorage: {
        key: 'mapData',
        validator: ({ restored, initial }) => {
          return restored as typeof initial;
        },
        versioning: {
          version: 1,
          migrator: ({ legacy, initial }) => {
            migratorSpy();

            return legacy as typeof initial;
          },
        },
      },
    });

    expect(storage.getState()).toEqual(value);
    expect(migratorSpy).toHaveBeenCalledTimes(0);

    // should trigger migration only when versions differ
    new GlobalStore(new Set(), {
      localStorage: {
        key: 'mapData',
        validator: ({ restored, initial }) => {
          return restored as typeof initial;
        },
        versioning: {
          version: 2,
          migrator: ({ legacy }) => {
            migratorSpy();

            const map = legacy as Map<unknown, unknown>;
            const [first] = [...map.entries()];

            return new Set([...first.values()]);
          },
        },
      },
    });

    new GlobalStore(new Set(), {
      localStorage: {
        key: 'mapData',
        validator: ({ restored, initial }) => {
          return restored as typeof initial;
        },
        versioning: {
          version: 2,

          migrator: () => {
            migratorSpy();

            return new Set();
          },
        },
      },
    });

    expect(migratorSpy).toHaveBeenCalledTimes(1);
  });

  it('should fallback if migration fails', () => {
    const value = new Map<unknown, unknown>([['#', ['a', 'b', 'c']]]);

    const envelope: ItemEnvelope<typeof value> = {
      s: value,
      v: 1,
    };

    localStorage.setItem('mapData', formatToStore(envelope));

    jest.spyOn(console, 'error').mockImplementation(jest.fn());

    const store = new GlobalStore(new Map(), {
      localStorage: {
        key: 'mapData',
        validator: ({ restored, initial }) => {
          return restored as typeof initial;
        },

        versioning: {
          version: 2,

          migrator: () => {
            throw new Error('Migration failed');
          },
        },
      },
    });

    expect(store.getState()).toEqual(new Map());
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('should default to initial state if storage is corrupted during initialization', () => {
    // simulate corrupted JSON
    localStorage.setItem('mapData', '{a/corrupted_json}');

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const store = new GlobalStore(new Map(), {
      localStorage: {
        key: 'mapData',
        validator: ({ restored, initial }) => {
          if (!(restored instanceof Map)) return initial;
          return restored as typeof initial;
        },
      },
    });

    // ensure the state fell back to initial
    expect(store.getState() instanceof Map).toBe(true);
    expect(store.getState().size).toBe(0);

    // ensure the error handler logged the parsing error
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toMatch(/\[react-global-state-hooks\]/);
  });

  it('should call onError when there is an error during migration', () => {
    const value = new Map<unknown, unknown>([['#', ['a', 'b', 'c']]]);

    const envelope: ItemEnvelope<typeof value> = {
      s: value,
      v: 1,
    };

    localStorage.setItem('mapData', formatToStore(envelope));

    const errorSpy = jest.fn();

    const store = new GlobalStore(new Map(), {
      localStorage: {
        key: 'mapData',
        validator: ({ restored, initial }) => {
          return restored as typeof initial;
        },
        onError: (error) => {
          errorSpy(error);
        },
        versioning: {
          version: 2,

          migrator: () => {
            throw new Error('Migration failed');
          },
        },
      },
    });

    expect(store.getState()).toEqual(new Map());
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('createGlobalState', () => {
  it('should create a store with  storage', ({ renderHook }) => {
    const envelope: ItemEnvelope<Map<string, number>> = {
      s: new Map<string, number>([['prop', 0]]),
      v: '1',
    };

    localStorage.setItem('data', formatToStore(envelope));

    const useData = createGlobalState(new Map<string, number>(), {
      localStorage: {
        key: 'data',
        validator: ({ restored, initial }) => {
          if (isMap(restored)) {
            return restored as typeof initial;
          }

          return initial;
        },
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

describe('localStorage selector', () => {
  it('should selectively persist and restore state using selector', () => {
    type AppState = {
      user: { name: string; email: string };
      settings: { theme: string };
      sessionData: { temp: string };
    };

    const initialState: AppState = {
      user: { name: 'John', email: 'john@example.com' },
      settings: { theme: 'dark' },
      sessionData: { temp: 'temp-data' },
    };

    // First: create a store that only persists user and settings
    const storage = new GlobalStore(initialState, {
      localStorage: {
        key: 'appState',
        selector: <T extends Partial<AppState>>(state: AppState) =>
          ({
            user: state.user,
            settings: state.settings,
          }) as T,
        validator: ({ restored, initial }) => {
          if (typeof restored === 'object' && restored !== null) {
            return { ...initial, ...restored } as AppState;
          }
          return initial;
        },
      },
    });

    // Update all fields including non-persisted sessionData
    storage.setState({
      user: { name: 'Jane', email: 'jane@example.com' },
      settings: { theme: 'light' },
      sessionData: { temp: 'new-temp' },
    });

    // Verify only selected fields are in localStorage
    const storedValue = localStorage.getItem('appState');
    const parsed = formatFromStore<ItemEnvelope<Partial<AppState>>>(storedValue!);

    expect(parsed.s).toEqual({
      user: { name: 'Jane', email: 'jane@example.com' },
      settings: { theme: 'light' },
    });
    expect(parsed.s).not.toHaveProperty('sessionData');

    // Now create a new store instance to test restoration
    const newInitialState: AppState = {
      user: { name: 'Default', email: 'default@example.com' },
      settings: { theme: 'system' },
      sessionData: { temp: 'fresh-session' },
    };

    const restoredStorage = new GlobalStore(newInitialState, {
      localStorage: {
        key: 'appState',
        selector: <T extends Partial<AppState>>(state: AppState) =>
          ({
            user: state.user,
            settings: state.settings,
          }) as T,
        validator: ({ restored, initial }) => {
          if (typeof restored === 'object' && restored !== null) {
            return { ...initial, ...restored } as AppState;
          }
          return initial;
        },
      },
    });

    const restoredState = restoredStorage.getState();

    // Selected fields should be restored from localStorage
    expect(restoredState.user).toEqual({ name: 'Jane', email: 'jane@example.com' });
    expect(restoredState.settings).toEqual({ theme: 'light' });

    // Non-selected field should use initial value
    expect(restoredState.sessionData).toEqual({ temp: 'fresh-session' });
  });
});

describe('getter subscriptions custom global state', () => {
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

    useState.setState((state) => ({
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

    useState.setState((state) => ({
      ...state,
      a: 4,
    }));

    // the subscription should not be called since it was removed
    expect(subscriptionSpy).toHaveBeenCalledTimes(2);
    expect(subscriptionDerivateSpy).toHaveBeenCalledTimes(1);
  });
});
