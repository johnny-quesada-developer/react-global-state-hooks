import { createGlobalState, InferAPI } from '..';
import it from './$it';
import { act } from '@testing-library/react';

describe('createGlobalState - Edge Cases', () => {
  it('should handle state as function', ({ renderHook }) => {
    const stateFactory = jest.fn(() => ({ count: 100 }));

    const useStore = createGlobalState(stateFactory);

    expect(stateFactory).toHaveBeenCalledTimes(1);
    expect(useStore.getState()).toEqual({ count: 100 });

    const { result } = renderHook(() => useStore());

    expect(result.current[0]).toEqual({ count: 100 });
  });

  it('should handle metadata as function', () => {
    const metadataFactory = jest.fn(() => ({
      initialized: true,
      timestamp: Date.now(),
    }));

    const useStore = createGlobalState(0, {
      metadata: metadataFactory,
    });

    expect(metadataFactory).toHaveBeenCalledTimes(1);

    const metadata = useStore.getMetadata();
    expect(metadata.initialized).toBe(true);
    expect(metadata.timestamp).toBeGreaterThan(0);
  });

  it('should handle both state and metadata as functions', ({ renderHook }) => {
    const stateFactory = jest.fn(() => 'initial state');
    const metadataFactory = jest.fn(() => ({ version: 1 }));

    const useStore = createGlobalState(stateFactory, {
      metadata: metadataFactory,
    });

    expect(stateFactory).toHaveBeenCalledTimes(1);
    expect(metadataFactory).toHaveBeenCalledTimes(1);

    const { result } = renderHook(() => useStore());

    expect(result.current[0]).toBe('initial state');
    expect(result.current[2]).toEqual({ version: 1 });
  });

  it('should pass all constructor params correctly', () => {
    const onInitSpy = jest.fn();
    const onStateChangedSpy = jest.fn();

    const useStore = createGlobalState(
      { value: 10 },
      {
        metadata: { meta: 'data' },
        callbacks: {
          onInit: onInitSpy,
          onStateChanged: onStateChangedSpy,
        },
        actions: {
          increment() {
            return ({ setState, getState }) => {
              setState({ value: getState().value + 1 });
            };
          },
        },
        name: 'TestStore',
      },
    );

    expect(onInitSpy).toHaveBeenCalledTimes(1);
    expect(useStore.getState()).toEqual({ value: 10 });
    expect(useStore.getMetadata()).toEqual({ meta: 'data' });

    act(() => {
      useStore.actions.increment();
    });

    expect(onStateChangedSpy).toHaveBeenCalledTimes(1);
    expect(useStore.getState()).toEqual({ value: 11 });
  });

  it('should return StateHook type', ({ renderHook }) => {
    const useStore = createGlobalState(0);

    // Should be callable as hook
    const { result } = renderHook(() => useStore());

    expect(result.current).toHaveLength(3);
    expect(typeof result.current[1]).toBe('function');

    // Should have static methods
    expect(useStore.getState).toBeInstanceOf(Function);
    expect(useStore.setState).toBeInstanceOf(Function);
    expect(useStore.subscribe).toBeInstanceOf(Function);
    expect(useStore.getMetadata).toBeInstanceOf(Function);
    expect(useStore.setMetadata).toBeInstanceOf(Function);
  });

  it('should have proper type inference with InferAPI', () => {
    const useStore = createGlobalState(0, {
      metadata: { version: 1 },
      actions: {
        increment() {
          return ({ setState, getState }) => {
            setState(getState() + 1);
          };
        },
        reset() {
          return ({ setState }) => {
            setState(0);
          };
        },
      },
    });

    type StoreAPI = InferAPI<typeof useStore>;

    // Verify types at compile time
    const api: StoreAPI = useStore;

    expect(api.actions.increment).toBeInstanceOf(Function);
    expect(api.actions.reset).toBeInstanceOf(Function);
    expect(api.getState()).toBe(0);
  });

  it('should handle primitive state types', ({ renderHook }) => {
    const useNumber = createGlobalState(42);
    const useString = createGlobalState('hello');
    const useBoolean = createGlobalState(true);
    const useNull = createGlobalState(null as string | null);
    const useUndefined = createGlobalState(undefined as string | undefined);

    const { result: numResult } = renderHook(() => useNumber());
    const { result: strResult } = renderHook(() => useString());
    const { result: boolResult } = renderHook(() => useBoolean());
    const { result: nullResult } = renderHook(() => useNull());
    const { result: undefinedResult } = renderHook(() => useUndefined());

    expect(numResult.current[0]).toBe(42);
    expect(strResult.current[0]).toBe('hello');
    expect(boolResult.current[0]).toBe(true);
    expect(nullResult.current[0]).toBe(null);
    expect(undefinedResult.current[0]).toBe(undefined);
  });

  it('should handle complex state types', ({ renderHook }) => {
    type ComplexState = {
      users: Map<number, { name: string; age: number }>;
      tags: Set<string>;
      metadata: {
        created: Date;
        nested: { deep: { value: string } };
      };
    };

    const initialState: ComplexState = {
      users: new Map([[1, { name: 'Alice', age: 30 }]]),
      tags: new Set(['tag1', 'tag2']),
      metadata: {
        created: new Date('2024-01-01'),
        nested: { deep: { value: 'test' } },
      },
    };

    const useStore = createGlobalState(initialState);

    const { result } = renderHook(() => useStore());

    expect(result.current[0].users.get(1)).toEqual({ name: 'Alice', age: 30 });
    expect(result.current[0].tags.has('tag1')).toBe(true);
    expect(result.current[0].metadata.nested.deep.value).toBe('test');
  });

  it('should handle state with class instances', ({ renderHook }) => {
    class Counter {
      constructor(public value: number) {}
      increment() {
        this.value++;
      }
    }

    const useStore = createGlobalState(new Counter(0));

    const { result } = renderHook(() => useStore());

    expect(result.current[0]).toBeInstanceOf(Counter);
    expect(result.current[0].value).toBe(0);

    act(() => {
      const newCounter = new Counter(5);
      result.current[1](newCounter);
    });

    expect(result.current[0].value).toBe(5);
  });

  it('should handle state factory function being called only once', () => {
    let callCount = 0;
    const stateFactory = () => {
      callCount++;
      return { count: callCount };
    };

    const useStore1 = createGlobalState(stateFactory);
    const useStore2 = createGlobalState(stateFactory);

    expect(useStore1.getState()).toEqual({ count: 1 });
    expect(useStore2.getState()).toEqual({ count: 2 });
    expect(callCount).toBe(2);
  });

  it('should handle metadata factory function being called only once', () => {
    let callCount = 0;
    const metadataFactory = () => {
      callCount++;
      return { id: callCount };
    };

    const useStore1 = createGlobalState(0, { metadata: metadataFactory });
    const useStore2 = createGlobalState(0, { metadata: metadataFactory });

    expect(useStore1.getMetadata()).toEqual({ id: 1 });
    expect(useStore2.getMetadata()).toEqual({ id: 2 });
    expect(callCount).toBe(2);
  });

  it('should preserve state factory for reset functionality', async () => {
    const stateFactory = () => ({ count: Math.random() });
    const useStore = createGlobalState(stateFactory);

    act(() => {
      useStore.setState({ count: 999 });
    });

    expect(useStore.getState()).toEqual({ count: 999 });

    await act(async () => {
      // Reset uses the stored factory function
      const newState = stateFactory();
      const newMetadata = useStore.getMetadata();
      await useStore.reset(newState, newMetadata);
    });

    // Should have new random value
    expect(useStore.getState().count).not.toBe(999);
  });

  it('should handle empty metadata object as default', ({ renderHook }) => {
    const useStore = createGlobalState(0);

    const { result } = renderHook(() => useStore());

    expect(result.current[2]).toEqual({});
  });

  it('should handle all hook API methods', ({ renderHook }) => {
    const useStore = createGlobalState(0);

    expect(useStore.getState).toBeInstanceOf(Function);
    expect(useStore.setState).toBeInstanceOf(Function);
    expect(useStore.getMetadata).toBeInstanceOf(Function);
    expect(useStore.setMetadata).toBeInstanceOf(Function);
    expect(useStore.subscribe).toBeInstanceOf(Function);
    expect(useStore.reset).toBeInstanceOf(Function);
    expect(useStore.dispose).toBeInstanceOf(Function);
    expect(useStore.createSelectorHook).toBeInstanceOf(Function);
    expect(useStore.createObservable).toBeInstanceOf(Function);
    expect(useStore.select).toBeInstanceOf(Function);
    expect(useStore.use).toBeInstanceOf(Function);
    expect(useStore.subscribers).toBeInstanceOf(Set);

    const { result } = renderHook(() => useStore());

    expect(Array.isArray(result.current)).toBe(true);
    expect(result.current).toHaveLength(3);
  });

  it('should handle store with actions having null setState initially', () => {
    const useStore = createGlobalState(0, {
      actions: {
        test() {
          return ({ actions }) => {
            expect(actions).toBeDefined();
            expect(actions.test).toBeInstanceOf(Function);
          };
        },
      },
    });

    expect(useStore.actions).not.toBe(null);
    expect(useStore.actions.test).toBeInstanceOf(Function);
  });
});
