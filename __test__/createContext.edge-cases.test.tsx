import React, { useEffect } from 'react';
import { createContext, InferAPI } from '..';
import { act, render } from '@testing-library/react';
import it from './$it';

describe('createContext - Provider Lifecycle', () => {
  it('should execute onMounted callback from contextArgs', ({ renderHook, strict }) => {
    const onMountedSpy = jest.fn();
    const cleanupSpy = jest.fn();

    const store = createContext(0, {
      callbacks: {
        onMounted: () => {
          onMountedSpy();
          return cleanupSpy;
        },
      },
    });

    const { unmount } = renderHook(() => store.use(), {
      wrapper: store.Provider,
    });

    expect(onMountedSpy).toHaveBeenCalledTimes(strict ? 2 : 1);
    // In strict mode, cleanup is also called once during mount
    if (!strict) {
      expect(cleanupSpy).not.toHaveBeenCalled();
    }

    unmount();

    expect(cleanupSpy).toHaveBeenCalledTimes(strict ? 2 : 1);
  });

  it('should execute onUnMount callback when provider unmounts', ({ renderHook, strict }) => {
    const onUnMountSpy = jest.fn();

    const store = createContext(0, {
      callbacks: {
        onUnMount: onUnMountSpy,
      },
    });

    const { unmount } = renderHook(() => store.use(), {
      wrapper: store.Provider,
    });

    // In strict mode, onUnMount is called once during mount (React 18 behavior)
    if (!strict) {
      expect(onUnMountSpy).not.toHaveBeenCalled();
    }

    unmount();

    expect(onUnMountSpy).toHaveBeenCalledTimes(strict ? 2 : 1);
  });

  it('should handle provider unmounting with active subscriptions', ({ renderHook }) => {
    const store = createContext(0);
    const subscribeSpy = jest.fn();

    const { context, wrapper } = store.Provider.makeProviderWrapper();

    const { unmount } = renderHook(
      () => {
        const [count] = store.use();
        useEffect(() => {
          const unsubscribe = context.current.subscribe(subscribeSpy);
          return unsubscribe;
        }, []);
        return count;
      },
      { wrapper },
    );

    expect(subscribeSpy).toHaveBeenCalledWith(0);
    expect(context.instance.subscribers.size).toBeGreaterThan(0);

    unmount();

    expect(context.instance.subscribers.size).toBe(0);
  });

  it('should handle provider re-mounting', ({ renderHook, strict }) => {
    const onInitSpy = jest.fn();
    const onMountedSpy = jest.fn();

    const store = createContext(0, {
      callbacks: {
        onInit: onInitSpy,
        onMounted: onMountedSpy,
      },
    });

    const { unmount: unmount1 } = renderHook(() => store.use(), {
      wrapper: store.Provider,
    });

    expect(onInitSpy).toHaveBeenCalledTimes(strict ? 2 : 1);
    expect(onMountedSpy).toHaveBeenCalledTimes(strict ? 2 : 1);

    unmount1();

    const { unmount: unmount2 } = renderHook(() => store.use(), {
      wrapper: store.Provider,
    });

    // New provider instance should call init and mounted again
    expect(onInitSpy).toHaveBeenCalledTimes(strict ? 4 : 2);
    expect(onMountedSpy).toHaveBeenCalledTimes(strict ? 4 : 2);

    unmount2();
  });

  it('should handle nested providers of different contexts', ({ renderHook }) => {
    const storeA = createContext(1, { name: 'contextA' });
    const storeB = createContext(2, { name: 'contextB' });

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <storeA.Provider>
        <storeB.Provider>{children}</storeB.Provider>
      </storeA.Provider>
    );

    const { result } = renderHook(
      () => ({
        a: storeA.use(),
        b: storeB.use(),
      }),
      { wrapper: Wrapper },
    );

    expect(result.current.a[0]).toBe(1);
    expect(result.current.b[0]).toBe(2);
  });
});

describe('createContext - Value Initialization', () => {
  it('should handle valueArg as function returning state', ({ renderHook }) => {
    const stateFactory = jest.fn(() => ({ count: 10 }));
    const store = createContext(stateFactory);

    const { result } = renderHook(() => store.use(), {
      wrapper: store.Provider,
    });

    expect(stateFactory).toHaveBeenCalled();
    expect(result.current[0]).toEqual({ count: 10 });
  });

  it('should handle provider value prop as function receiving inherited state', ({ renderHook }) => {
    const store = createContext(5);

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <store.Provider value={(inherited) => inherited * 2}>{children}</store.Provider>
    );

    const { result } = renderHook(() => store.use(), { wrapper: Wrapper });

    expect(result.current[0]).toBe(10);
  });

  it('should handle provider value combining with inherited valueArg', ({ renderHook }) => {
    const store = createContext(() => ({ base: 100 }));

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <store.Provider value={(inherited) => ({ base: inherited.base + 50 })}>{children}</store.Provider>
    );

    const { result } = renderHook(() => store.use(), { wrapper: Wrapper });

    expect(result.current[0]).toEqual({ base: 150 });
  });

  it('should handle provider value overriding inherited value', ({ renderHook }) => {
    const store = createContext(10);

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <store.Provider value={99}>{children}</store.Provider>
    );

    const { result } = renderHook(() => store.use(), { wrapper: Wrapper });

    expect(result.current[0]).toBe(99);
  });

  it('should handle provider value as undefined', ({ renderHook }) => {
    const store = createContext(10);

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <store.Provider value={undefined}>{children}</store.Provider>
    );

    const { result } = renderHook(() => store.use(), { wrapper: Wrapper });

    expect(result.current[0]).toBe(10);
  });

  it('should handle metadata as function in contextArgs', ({ renderHook }) => {
    const metadataFactory = jest.fn(() => ({ initialized: true, version: 1 }));

    const store = createContext(0, {
      metadata: metadataFactory,
    });

    const { result } = renderHook(() => store.use(), {
      wrapper: store.Provider,
    });

    expect(metadataFactory).toHaveBeenCalled();
    expect(result.current[2]).toEqual({ initialized: true, version: 1 });
  });
});

describe('createContext - Observables', () => {
  it('should handle isEqual option for context observable', ({ renderHook }) => {
    const store = createContext({ count: 0, data: { value: 'test' } });
    const subscribeSpy = jest.fn();

    const { context, wrapper } = store.Provider.makeProviderWrapper();

    const customIsEqual = jest.fn((a, b) => a.value === b.value);

    const { result } = renderHook(
      () =>
        store.use.observable((state) => state.data, {
          isEqual: customIsEqual,
        }),
      { wrapper },
    );

    result.current.subscribe(subscribeSpy);

    expect(subscribeSpy).toHaveBeenCalledWith({ value: 'test' });

    act(() => {
      context.current.setState({ count: 1, data: { value: 'test' } });
    });

    expect(customIsEqual).toHaveBeenCalled();
    // Should not trigger because isEqual returns true
    expect(subscribeSpy).toHaveBeenCalledTimes(1);

    act(() => {
      context.current.setState({ count: 2, data: { value: 'changed' } });
    });

    expect(subscribeSpy).toHaveBeenCalledTimes(2);
    expect(subscribeSpy).toHaveBeenLastCalledWith({ value: 'changed' });
  });

  it('should handle isEqualRoot option for context observable', ({ renderHook }) => {
    const store = createContext({ count: 0 });
    const subscribeSpy = jest.fn();

    const { context, wrapper } = store.Provider.makeProviderWrapper();

    const customIsEqualRoot = jest.fn((a, b) => a.count === b.count);

    const { result } = renderHook(
      () =>
        store.use.observable((state) => state.count, {
          isEqualRoot: customIsEqualRoot,
        }),
      { wrapper },
    );

    result.current.subscribe(subscribeSpy);

    act(() => {
      // Different object reference but same count
      context.current.setState({ count: 0 });
    });

    expect(customIsEqualRoot).toHaveBeenCalled();
    // Should not trigger because root is considered equal
    expect(subscribeSpy).toHaveBeenCalledTimes(1);

    act(() => {
      context.current.setState({ count: 1 });
    });

    expect(subscribeSpy).toHaveBeenCalledTimes(2);
  });

  it('should handle name option for context observable', ({ renderHook }) => {
    const store = createContext(0);

    const { wrapper } = store.Provider.makeProviderWrapper();

    const { result } = renderHook(
      () =>
        store.use.observable((state) => state * 2, {
          name: 'doubledValue',
        }),
      { wrapper },
    );

    // Observable should work normally with custom name
    expect(result.current.getState()).toBe(0);
  });

  it('should handle multiple observables selecting different fields', ({ renderHook }) => {
    const store = createContext({ a: 1, b: 2 });
    const { context, wrapper } = store.Provider.makeProviderWrapper();

    // Render both observables in the SAME component/hook so they share the same provider instance
    const { result } = renderHook(
      () => {
        const obsA = store.use.observable((state) => state.a);
        const obsB = store.use.observable((state) => state.b);

        return { obsA, obsB };
      },
      { wrapper },
    );

    expect(result.current.obsA.getState()).toBe(1);
    expect(result.current.obsB.getState()).toBe(2);

    // Subscribe to track updates
    const spyA = jest.fn();
    const spyB = jest.fn();

    const unsubA = result.current.obsA.subscribe(spyA);
    const unsubB = result.current.obsB.subscribe(spyB);

    // Subscriptions trigger immediately with current value
    expect(spyA).toHaveBeenCalledTimes(1);
    expect(spyA).toHaveBeenCalledWith(1);
    expect(spyB).toHaveBeenCalledTimes(1);
    expect(spyB).toHaveBeenCalledWith(2);

    spyA.mockClear();
    spyB.mockClear();

    act(() => {
      context.current.setState({ a: 10, b: 2 }); // Only change 'a'
    });

    // Only spyA should be called since only 'a' changed
    expect(spyA).toHaveBeenCalledTimes(1);
    expect(spyA).toHaveBeenCalledWith(10);
    expect(spyB).not.toHaveBeenCalled(); // 'b' didn't change from 2 to 2
    expect(result.current.obsA.getState()).toBe(10);
    expect(result.current.obsB.getState()).toBe(2);

    unsubA();
    unsubB();
  });
});

describe('createContext - Selector Hooks', () => {
  it('should handle custom name for selector debugging', ({ renderHook }) => {
    const store = createContext(10);

    const { wrapper } = store.Provider.makeProviderWrapper();

    const useDoubled = store.use.createSelectorHook((state) => state * 2, {
      name: 'doubledSelector',
    });

    const { result } = renderHook(() => useDoubled(), { wrapper });

    expect(result.current).toBe(20);
  });

  it('should handle dependencies array in selector hook', ({ renderHook }) => {
    const store = createContext({ count: 0 });

    const { wrapper } = store.Provider.makeProviderWrapper();

    const multiplier = { current: 2 };
    const selectorSpy = jest.fn((state) => state.count * multiplier.current);

    const useMultiplied = store.use.createSelectorHook(selectorSpy, {
      name: 'multipliedHook',
    });

    const { result, rerender } = renderHook(() => useMultiplied(), { wrapper });

    expect(result.current).toBe(0);
    expect(selectorSpy).toHaveBeenCalled();

    const callCount = selectorSpy.mock.calls.length;

    // Rerender without changing deps
    rerender();

    // Selector is called on every render for context hooks
    expect(selectorSpy.mock.calls.length).toBeGreaterThanOrEqual(callCount);
  });
});

describe('createContext - Error Cases', () => {
  it('should throw error when using use hook outside Provider', ({ renderHook }) => {
    const store = createContext(0);

    const { result } = renderHook(() => {
      try {
        return store.use();
      } catch (e) {
        return e;
      }
    });

    expect(result.current).toBeInstanceOf(Error);
    expect((result.current as Error).message).toContain('use hook must be used within a ContextProvider');
  });

  it('should throw error when using api hook outside Provider', ({ renderHook }) => {
    const store = createContext(0);

    const { result } = renderHook(() => {
      try {
        return store.use.api();
      } catch (e) {
        return e;
      }
    });

    expect(result.current).toBeInstanceOf(Error);
    expect((result.current as Error).message).toContain('api hook must be used within a ContextProvider');
  });

  it('should throw error when using observable hook outside Provider', ({ renderHook }) => {
    const store = createContext(0);

    const { result } = renderHook(() => {
      try {
        return store.use.observable((state) => state);
      } catch (e) {
        return e;
      }
    });

    expect(result.current).toBeInstanceOf(Error);
    expect((result.current as Error).message).toContain('api hook must be used within a ContextProvider');
  });

  it('should throw error when using actions hook outside Provider', ({ renderHook }) => {
    const store = createContext(0, {
      actions: {
        test() {
          return () => {};
        },
      },
    });

    const { result } = renderHook(() => {
      try {
        return store.use.actions();
      } catch (e) {
        return e;
      }
    });

    expect(result.current).toBeInstanceOf(Error);
    expect((result.current as Error).message).toContain('api hook must be used within a ContextProvider');
  });
});

describe('createContext - makeProviderWrapper', () => {
  it('should merge onCreated callbacks from parent and child options', () => {
    const parentOnCreatedSpy = jest.fn();
    const childOnCreatedSpy = jest.fn();

    const store = createContext(0, {
      callbacks: {
        onCreated: childOnCreatedSpy,
      },
    });

    const { wrapper } = store.Provider.makeProviderWrapper({
      onCreated: parentOnCreatedSpy,
    });

    render(<div>test</div>, { wrapper });

    expect(parentOnCreatedSpy).toHaveBeenCalledTimes(1);
    expect(childOnCreatedSpy).toHaveBeenCalledTimes(1);
  });

  it('should handle onMounted callback in wrapper options', () => {
    const onMountedSpy = jest.fn();
    const cleanupSpy = jest.fn();

    const store = createContext(0);

    const { wrapper } = store.Provider.makeProviderWrapper({
      onMounted: () => {
        onMountedSpy();
        return cleanupSpy;
      },
    });

    const { unmount } = render(<div>test</div>, { wrapper });

    expect(onMountedSpy).toHaveBeenCalledTimes(1);
    expect(cleanupSpy).not.toHaveBeenCalled();

    unmount();

    expect(cleanupSpy).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple wrappers created from same context', ({ renderHook }) => {
    const store = createContext(0);

    const { wrapper: wrapper1, context: context1 } = store.Provider.makeProviderWrapper();
    const { wrapper: wrapper2, context: context2 } = store.Provider.makeProviderWrapper();

    const { result: result1 } = renderHook(() => store.use(), {
      wrapper: wrapper1,
    });
    const { result: result2 } = renderHook(() => store.use(), {
      wrapper: wrapper2,
    });

    expect(result1.current[0]).toBe(0);
    expect(result2.current[0]).toBe(0);

    // They should be independent
    act(() => {
      context1.current.setState(10);
    });

    expect(result1.current[0]).toBe(10);
    expect(result2.current[0]).toBe(0); // Unchanged

    act(() => {
      context2.current.setState(20);
    });

    expect(result1.current[0]).toBe(10); // Unchanged
    expect(result2.current[0]).toBe(20);
  });

  it('should handle wrapper with value and onCreated props', () => {
    const onCreatedSpy = jest.fn();

    const store = createContext(0);

    const { wrapper, context } = store.Provider.makeProviderWrapper({
      value: 100,
      onCreated: onCreatedSpy,
    });

    const { container } = render(<div>test</div>, { wrapper });

    expect(container).toBeTruthy();
    expect(onCreatedSpy).toHaveBeenCalled();
    expect(context.current.getState()).toBe(100);
  });
});

describe('createContext - Display Names', () => {
  it('should use custom name in contextArgs for displayName', () => {
    const store = createContext(0, { name: 'CustomCounter' });

    expect(store.use.displayName).toBe('CustomCounter');
    expect(store.Provider.displayName).toBe('CustomCounter:Provider');
    expect(store.Context.displayName).toBe('CustomCounter');
  });

  it('should generate unique IDs when no name provided', () => {
    const store1 = createContext(0);
    const store2 = createContext(0);

    expect(store1.use.displayName).toBeTruthy();
    expect(store2.use.displayName).toBeTruthy();
    expect(store1.use.displayName).not.toBe(store2.use.displayName);
  });

  it('should use displayName in selector hooks', ({ renderHook }) => {
    const store = createContext(0, { name: 'MyCounter' });

    const useDoubled = store.use.createSelectorHook((state) => state * 2, {
      name: 'doubledHook',
    });

    const { wrapper } = store.Provider.makeProviderWrapper();

    renderHook(() => useDoubled(), { wrapper });

    expect(useDoubled.displayName).toBe('MyCounter');
  });
});

describe('createContext - Complex Scenarios', () => {
  it('should handle context with complex state and multiple lifecycle hooks', ({ renderHook }) => {
    const onInitSpy = jest.fn();
    const onCreatedSpy = jest.fn();
    const onMountedSpy = jest.fn();
    const onStateChangedSpy = jest.fn();

    const store = createContext(
      { users: [] as { id: number; name: string }[], selectedId: null as number | null },
      {
        name: 'UserContext',
        metadata: { loaded: false },
        callbacks: {
          onInit: onInitSpy,
          onCreated: onCreatedSpy,
          onMounted: onMountedSpy,
          onStateChanged: onStateChangedSpy,
        },
        actions: {
          addUser(name: string) {
            return ({ setState, getState }) => {
              const currentState = getState();
              setState({
                ...currentState,
                users: [...currentState.users, { id: currentState.users.length + 1, name }],
              });
            };
          },
          selectUser(id: number) {
            return ({ setState, getState }) => {
              const currentState = getState();
              setState({ ...currentState, selectedId: id });
            };
          },
        },
      },
    );

    const { result } = renderHook(() => store.use.actions(), {
      wrapper: store.Provider,
    });

    expect(onInitSpy).toHaveBeenCalled();
    expect(onCreatedSpy).toHaveBeenCalled();
    expect(onMountedSpy).toHaveBeenCalled();

    act(() => {
      result.current.addUser('Alice');
    });

    expect(onStateChangedSpy).toHaveBeenCalled();

    act(() => {
      result.current.selectUser(1);
    });

    expect(onStateChangedSpy).toHaveBeenCalledTimes(2);
  });

  it('should handle provider with inherited state function and actions', ({ renderHook }) => {
    type CounterAPI = InferAPI<typeof store>;

    const store = createContext(() => ({ count: 10 }), {
      actions: {
        increment() {
          return ({ setState, getState }) => {
            setState({ count: getState().count + 1 });
          };
        },
      },
    });

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <store.Provider value={(inherited) => ({ count: inherited.count * 2 })}>{children}</store.Provider>
    );

    const { result } = renderHook(() => store.use(), { wrapper: Wrapper });

    expect(result.current[0]).toEqual({ count: 20 });

    act(() => {
      (result.current[1] as CounterAPI['actions']).increment();
    });

    expect(result.current[0]).toEqual({ count: 21 });
  });
});
