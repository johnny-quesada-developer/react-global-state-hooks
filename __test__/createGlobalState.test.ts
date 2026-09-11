import { createGlobalState } from '../src';
import { act } from '@testing-library/react';
import it from './$it';

describe('createGlobalState - additional edge cases', () => {
  it('should handle function initializers correctly', ({ renderHook }) => {
    const initializer = jest.fn(() => ({ count: 10, name: 'test' }));
    const useState = createGlobalState(initializer);

    expect(initializer).toHaveBeenCalledTimes(1);

    const { result } = renderHook(() => useState());
    const [state] = result.current;

    expect(state).toEqual({ count: 10, name: 'test' });
  });

  it('should handle metadata as a function initializer', ({ renderHook }) => {
    const metadataInitializer = jest.fn(() => ({ timestamp: Date.now(), version: 1 }));
    const useState = createGlobalState(0, {
      metadata: metadataInitializer,
    });

    expect(metadataInitializer).toHaveBeenCalledTimes(1);

    const { result } = renderHook(() => useState());
    const [, , metadata] = result.current;

    expect(metadata.version).toBe(1);
    expect(typeof metadata.timestamp).toBe('number');
  });

  it('should expose getState and setState on the hook', () => {
    const useState = createGlobalState(42);

    expect(typeof useState.getState).toBe('function');
    expect(typeof useState.setState).toBe('function');
    expect(useState.getState()).toBe(42);

    act(() => {
      useState.setState(100);
    });
    expect(useState.getState()).toBe(100);
  });

  it('should expose getMetadata and setMetadata on the hook', () => {
    const useState = createGlobalState(0, {
      metadata: { counter: 0 },
    });

    expect(typeof useState.getMetadata).toBe('function');
    expect(typeof useState.setMetadata).toBe('function');
    expect(useState.getMetadata().counter).toBe(0);

    act(() => {
      useState.setMetadata({ counter: 5 });
    });
    expect(useState.getMetadata().counter).toBe(5);
  });

  it('should allow state updates via setState without rendering', () => {
    const useState = createGlobalState({ value: 1 });

    act(() => {
      useState.setState({ value: 2 });
    });
    expect(useState.getState().value).toBe(2);

    act(() => {
      useState.setState((prev) => ({ value: prev.value + 10 }));
    });
    expect(useState.getState().value).toBe(12);
  });

  it('should handle complex state types', ({ renderHook }) => {
    type ComplexState = {
      users: Map<string, { name: string; age: number }>;
      settings: Set<string>;
      metadata: { lastUpdate: Date };
    };

    const initialState: ComplexState = {
      users: new Map([['user1', { name: 'John', age: 30 }]]),
      settings: new Set(['dark-mode', 'notifications']),
      metadata: { lastUpdate: new Date('2024-01-01') },
    };

    const useState = createGlobalState(initialState);
    const { result } = renderHook(() => useState());
    const [state] = result.current;

    expect(state.users).toBeInstanceOf(Map);
    expect(state.users.get('user1')?.name).toBe('John');
    expect(state.settings).toBeInstanceOf(Set);
    expect(state.settings.has('dark-mode')).toBe(true);
    expect(state.metadata.lastUpdate).toBeInstanceOf(Date);
  });

  it('should handle primitive state types', ({ renderHook }) => {
    const useString = createGlobalState('initial');
    const useNumber = createGlobalState(42);
    const useBoolean = createGlobalState(true);
    const useNull = createGlobalState(null);

    const { result: r1 } = renderHook(() => useString());
    const { result: r2 } = renderHook(() => useNumber());
    const { result: r3 } = renderHook(() => useBoolean());
    const { result: r4 } = renderHook(() => useNull());

    expect(r1.current[0]).toBe('initial');
    expect(r2.current[0]).toBe(42);
    expect(r3.current[0]).toBe(true);
    expect(r4.current[0]).toBe(null);
  });

  it('should support custom name for debugging', () => {
    const useState = createGlobalState(0, {
      name: 'CounterState',
    });

    // The name is stored internally, we can't directly access it
    // but we can verify the state was created successfully
    expect(useState.getState()).toBe(0);
  });

  it('should handle setState with updater function', ({ renderHook }) => {
    const useState = createGlobalState({ count: 0 });
    const { result, rerender } = renderHook(() => useState());

    act(() => {
      useState.setState((prev) => ({ count: prev.count + 5 }));
    });
    rerender();

    expect(result.current[0].count).toBe(5);
  });

  it('should handle empty metadata', ({ renderHook }) => {
    const useState = createGlobalState(0, {
      metadata: {},
    });

    const { result } = renderHook(() => useState());
    const [, , metadata] = result.current;

    expect(metadata).toEqual({});
  });

  it('should work with undefined as initial state', ({ renderHook }) => {
    const useState = createGlobalState<number | undefined>(undefined);
    const { result } = renderHook(() => useState());

    expect(result.current[0]).toBeUndefined();
  });

  it('should handle array state correctly', ({ renderHook }) => {
    const useState = createGlobalState([1, 2, 3]);
    const { result, rerender } = renderHook(() => useState());

    act(() => {
      useState.setState([...result.current[0], 4]);
    });
    rerender();

    expect(result.current[0]).toEqual([1, 2, 3, 4]);
  });

  it('should allow creating multiple independent states', ({ renderHook }) => {
    const useState1 = createGlobalState(1);
    const useState2 = createGlobalState(2);

    const { result: r1 } = renderHook(() => useState1());
    const { result: r2 } = renderHook(() => useState2());

    expect(r1.current[0]).toBe(1);
    expect(r2.current[0]).toBe(2);

    act(() => {
      useState1.setState(10);
      useState2.setState(20);
    });

    expect(useState1.getState()).toBe(10);
    expect(useState2.getState()).toBe(20);
  });

  it('should handle rapid state updates', () => {
    const useState = createGlobalState(0);

    act(() => {
      for (let i = 1; i <= 100; i++) {
        useState.setState(i);
      }
    });

    expect(useState.getState()).toBe(100);
  });

  it('should handle actions returning values', () => {
    const useState = createGlobalState(0, {
      actions: {
        increment() {
          return ({ setState, getState }) => {
            setState((s) => s + 1);
            return getState();
          };
        },
        add(n: number) {
          return ({ setState, getState }) => {
            setState((s) => s + n);
            return getState();
          };
        },
      },
    });

    let result1!: number;
    act(() => {
      result1 = useState.actions.increment();
    });
    expect(result1).toBe(1);

    let result2!: number;
    act(() => {
      result2 = useState.actions.add(5);
    });
    expect(result2).toBe(6);
  });

  it('should expose actions on the hook instance', () => {
    const useState = createGlobalState(0, {
      actions: {
        reset() {
          return ({ setState }) => {
            setState(0);
          };
        },
      },
    });

    expect(typeof useState.actions.reset).toBe('function');

    act(() => {
      useState.setState(100);
    });
    expect(useState.getState()).toBe(100);

    act(() => {
      useState.actions.reset();
    });
    expect(useState.getState()).toBe(0);
  });

  it('should handle nested object updates immutably', ({ renderHook }) => {
    const useState = createGlobalState({
      user: {
        profile: {
          name: 'John',
          age: 30,
        },
      },
    });

    const { result, rerender } = renderHook(() => useState());
    const originalState = result.current[0];

    act(() => {
      useState.setState({
        user: {
          profile: {
            name: 'Jane',
            age: 25,
          },
        },
      });
    });

    rerender();
    const newState = result.current[0];

    expect(newState.user.profile.name).toBe('Jane');
    expect(originalState.user.profile.name).toBe('John'); // original unchanged
  });

  it('should handle createSelectorHook for derived state', ({ renderHook }) => {
    const useState = createGlobalState({
      firstName: 'John',
      lastName: 'Doe',
      age: 30,
    });

    const useFullName = useState.createSelectorHook((state) => `${state.firstName} ${state.lastName}`);

    const { result } = renderHook(() => useFullName());
    expect(result.current).toBe('John Doe');

    act(() => {
      useState.setState({ firstName: 'Jane', lastName: 'Smith', age: 25 });
    });

    const { result: result2 } = renderHook(() => useFullName());
    expect(result2.current).toBe('Jane Smith');
  });

  it('should handle createObservable for subscriptions', () => {
    const useState = createGlobalState({ count: 0 });
    const spy = jest.fn();

    const observable = useState.createObservable((state) => state.count);
    const unsubscribe = observable(spy);

    expect(spy).toHaveBeenCalledWith(0);

    act(() => {
      useState.setState({ count: 5 });
    });
    expect(spy).toHaveBeenCalledWith(5);

    act(() => {
      useState.setState({ count: 10 });
    });
    expect(spy).toHaveBeenCalledWith(10);

    unsubscribe();

    act(() => {
      useState.setState({ count: 15 });
    });
    expect(spy).toHaveBeenCalledTimes(3); // Should not be called after unsubscribe
  });

  it('should handle subscribe without selector', () => {
    const useState = createGlobalState({ value: 1 });
    const spy = jest.fn();

    const unsubscribe = useState.subscribe(spy);

    expect(spy).toHaveBeenCalledWith({ value: 1 });

    act(() => {
      useState.setState({ value: 2 });
    });
    expect(spy).toHaveBeenCalledWith({ value: 2 });

    act(() => {
      unsubscribe();
    });
  });

  it('should handle subscribe with selector and callback', () => {
    const useState = createGlobalState({ a: 1, b: 2 });
    const spy = jest.fn();

    const unsubscribe = useState.subscribe((state) => state.a, spy);

    expect(spy).toHaveBeenCalledWith(1);

    act(() => {
      useState.setState({ a: 1, b: 3 }); // Only b changed
    });
    expect(spy).toHaveBeenCalledTimes(1); // Should not call again

    act(() => {
      useState.setState({ a: 5, b: 3 }); // a changed
    });
    expect(spy).toHaveBeenCalledWith(5);

    act(() => {
      unsubscribe();
    });
  });

  it('should handle reset method', () => {
    const useState = createGlobalState(() => ({ count: 0 }), {
      metadata: () => ({ version: 1 }),
    });

    act(() => {
      useState.setState({ count: 100 });
      useState.setMetadata({ version: 5 });
    });

    expect(useState.getState().count).toBe(100);
    expect(useState.getMetadata().version).toBe(5);

    act(() => {
      useState.reset();
    });

    expect(useState.getState().count).toBe(0);
    expect(useState.getMetadata().version).toBe(1);
  });

  it('should handle actions that modify metadata', ({ renderHook }) => {
    const useState = createGlobalState(0, {
      metadata: { updateCount: 0 },
      actions: {
        increment() {
          return ({ setState, setMetadata, getMetadata }) => {
            setState((s) => s + 1);
            setMetadata({ updateCount: getMetadata().updateCount + 1 });
          };
        },
      },
    });

    const { result, rerender } = renderHook(() => useState());

    expect(result.current[2].updateCount).toBe(0);

    act(() => {
      useState.actions.increment();
    });
    rerender();

    expect(result.current[0]).toBe(1);
    expect(result.current[2].updateCount).toBe(1);
  });

  it('should handle empty actions config', ({ renderHook }) => {
    const useState = createGlobalState(0, {
      actions: {},
    });

    const { result } = renderHook(() => useState());
    const [state, actions] = result.current;

    expect(state).toBe(0);
    expect(actions).toEqual({});
  });

  it('should maintain referential equality for metadata when not changed', ({ renderHook }) => {
    const useState = createGlobalState(0, {
      metadata: { test: true },
    });

    const { result, rerender } = renderHook(() => useState());
    const metadata1 = result.current[2];

    act(() => {
      useState.setState(1);
    });
    rerender();

    const metadata2 = result.current[2];

    expect(metadata1).toBe(metadata2); // Same reference
  });

  it('should create independent observable chains', () => {
    const useState = createGlobalState({ a: 1, b: 2, c: 3 });
    const spy1 = jest.fn();
    const spy2 = jest.fn();

    const obs1 = useState.createObservable((s) => s.a);
    const obs2 = useState.createObservable((s) => s.b);

    obs1(spy1);
    obs2(spy2);

    expect(spy1).toHaveBeenCalledWith(1);
    expect(spy2).toHaveBeenCalledWith(2);

    act(() => {
      useState.setState({ a: 10, b: 2, c: 3 });
    });

    expect(spy1).toHaveBeenCalledWith(10);
    expect(spy2).toHaveBeenCalledTimes(1); // b didn't change
  });

  it('should handle actions calling other actions', ({ renderHook }) => {
    const useState = createGlobalState(0, {
      actions: {
        add(n: number) {
          return ({ setState }) => {
            setState((s) => s + n);
          };
        },
        addTwice(n: number) {
          return ({ actions }) => {
            actions.add(n);
            actions.add(n);
          };
        },
      },
    });

    const { result, rerender } = renderHook(() => useState());

    act(() => {
      result.current[1].addTwice(5);
    });
    rerender();

    expect(result.current[0]).toBe(10);
  });

  it('should handle validation errors in localStorage', () => {
    const errorSpy = jest.fn();

    act(() => {
      localStorage.setItem('error-validation-key-functional', JSON.stringify({ some: 'data' }));
    });

    const useState = createGlobalState(0, {
      localStorage: {
        key: 'error-validation-key-functional',
        validator: jest.fn(() => {
          throw new Error('Validation failed');
        }),
        onError: () => {
          errorSpy();
        },
      },
    });

    expect(errorSpy).toHaveBeenCalled();
    expect(useState.getState()).toBe(0); // Stays at initial value
  });
});
