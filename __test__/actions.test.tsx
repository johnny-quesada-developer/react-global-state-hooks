import { act } from '@testing-library/react';
import { createGlobalState, actions, InferAPI, createContext } from '..';
// import { createGlobalState, createActions, InferAPI, createContext } from '../';
import it from './$it';

describe('actions', () => {
  it('should create actions directly bound to a store', () => {
    const counter = createGlobalState(0);

    const actions$ = actions(counter, {
      increment(amount: number) {
        return ({ setState }) => {
          setState((count) => count + amount);
        };
      },
      decrement(amount: number) {
        return ({ setState }) => {
          setState((count) => count - amount);
        };
      },
    });

    expect(counter.getState()).toBe(0);

    actions$.increment(5);
    expect(counter.getState()).toBe(5);

    actions$.decrement(3);
    expect(counter.getState()).toBe(2);
  });

  it('should create actions using builder pattern', () => {
    type CounterAPI = InferAPI<typeof counter>;

    const counter = createGlobalState(0);

    const actionsBuilder = actions<CounterAPI>()({
      increment(amount: number) {
        return ({ setState }) => {
          setState((count) => count + amount);
        };
      },
      decrement(amount: number) {
        return ({ setState }) => {
          setState((count) => count - amount);
        };
      },
    });

    const actions$ = actionsBuilder(counter);

    expect(counter.getState()).toBe(0);

    actions$.increment(5);
    expect(counter.getState()).toBe(5);

    actions$.decrement(3);
    expect(counter.getState()).toBe(2);
  });

  it('should allow actions to call each other using this keyword', () => {
    const counter = createGlobalState(0);

    const actions$ = actions(counter, {
      increment(amount: number) {
        return ({ setState }) => {
          setState((count) => count + amount);
        };
      },
      incrementTwice(amount: number) {
        return () => {
          this.increment(amount);
          this.increment(amount);
        };
      },
    });

    actions$.incrementTwice(5);
    expect(counter.getState()).toBe(10);
  });

  it('should allow actions to access parent store actions', () => {
    const logSpy = jest.fn();

    const counter = createGlobalState(0, {
      actions: {
        log(message: string) {
          return ({ getState }) => {
            logSpy(message, getState());
          };
        },
      },
    });

    const actions$ = actions(counter, {
      increment(amount: number) {
        return ({ setState, actions: parentActions }) => {
          setState((count) => count + amount);
          parentActions.log('incremented');
        };
      },
    });

    actions$.increment(5);

    expect(counter.getState()).toBe(5);
    expect(logSpy).toHaveBeenCalledWith('incremented', 5);
  });

  it('should work with complex state objects', () => {
    const store = createGlobalState({
      count: 0,
      history: [] as number[],
    });

    const actions$ = actions(store, {
      increment(amount: number) {
        return ({ setState, getState }) => {
          const current = getState();
          setState({
            count: current.count + amount,
            history: [...current.history, current.count + amount],
          });
        };
      },
      reset() {
        return ({ setState }) => {
          setState({ count: 0, history: [] });
        };
      },
    });

    actions$.increment(5);
    expect(store.getState()).toEqual({ count: 5, history: [5] });

    actions$.increment(3);
    expect(store.getState()).toEqual({ count: 8, history: [5, 8] });

    actions$.reset();
    expect(store.getState()).toEqual({ count: 0, history: [] });
  });

  it('should allow builder pattern to be reused across multiple stores', () => {
    type CounterAPI = InferAPI<typeof counter1>;

    const actionsBuilder = actions<CounterAPI>()({
      double() {
        return ({ setState, getState }) => {
          setState(getState() * 2);
        };
      },
      add(amount: number) {
        return ({ setState, getState }) => {
          setState(getState() + amount);
        };
      },
    });

    const counter1 = createGlobalState(5);
    const counter2 = createGlobalState(10);

    const actions1$ = actionsBuilder(counter1);
    const actions2$ = actionsBuilder(counter2);

    actions1$.double();
    expect(counter1.getState()).toBe(10);
    expect(counter2.getState()).toBe(10);

    actions2$.add(5);
    expect(counter1.getState()).toBe(10);
    expect(counter2.getState()).toBe(15);
  });

  it('should provide access to metadata in actions', () => {
    const counter = createGlobalState(0, {
      metadata: { lastAction: '' },
    });

    const actions$ = actions(counter, {
      increment(amount: number) {
        return ({ setState, setMetadata }) => {
          setState((count) => count + amount);
          setMetadata({ lastAction: 'increment' });
        };
      },
      decrement(amount: number) {
        return ({ setState, setMetadata }) => {
          setState((count) => count - amount);
          setMetadata({ lastAction: 'decrement' });
        };
      },
    });

    actions$.increment(5);
    expect(counter.getMetadata().lastAction).toBe('increment');

    actions$.decrement(2);
    expect(counter.getMetadata().lastAction).toBe('decrement');
  });

  it('should allow async actions', async () => {
    const store = createGlobalState({ data: null as string | null, loading: false });

    const actions$ = actions(store, {
      fetchData(id: string) {
        return async ({ setState }) => {
          setState((prev) => ({ ...prev, loading: true }));

          await new Promise((resolve) => setTimeout(resolve, 10));

          setState({ data: `Data for ${id}`, loading: false });
        };
      },
    });

    const promise = actions$.fetchData('123');
    expect(store.getState()).toEqual({ data: null, loading: true });

    await promise;
    expect(store.getState()).toEqual({ data: 'Data for 123', loading: false });
  });

  it('should allow actions to subscribe to state changes', () => {
    const counter = createGlobalState(0);
    const subscribeSpy = jest.fn();

    const actions$ = actions(counter, {
      watchChanges() {
        return ({ subscribe }) => {
          return subscribe((state) => {
            subscribeSpy(state);
          });
        };
      },
      increment() {
        return ({ setState }) => {
          setState((count) => count + 1);
        };
      },
    });

    const unsubscribe = actions$.watchChanges();

    expect(subscribeSpy).toHaveBeenCalledWith(0);

    actions$.increment();
    expect(subscribeSpy).toHaveBeenCalledWith(1);

    actions$.increment();
    expect(subscribeSpy).toHaveBeenCalledWith(2);

    unsubscribe();

    actions$.increment();
    // Should still be 2 calls since we unsubscribed
    expect(subscribeSpy).toHaveBeenCalledTimes(3);
  });

  it('should allow nested action calls with this context', () => {
    const counter = createGlobalState(0);

    const actions$ = actions(counter, {
      increment(amount: number) {
        return ({ setState }) => {
          setState((count) => count + amount);
        };
      },
      decrement(amount: number) {
        return ({ setState }) => {
          setState((count) => count - amount);
        };
      },
      incrementAndDecrement(amount: number) {
        return () => {
          this.increment(amount);
          this.decrement(amount / 2);
        };
      },
    });

    actions$.incrementAndDecrement(10);
    expect(counter.getState()).toBe(5);
  });

  it('should work with stores that have existing actions', () => {
    const logSpy = jest.fn();

    const counter = createGlobalState(0, {
      actions: {
        log(message: string) {
          return ({ getState }) => {
            logSpy(message, getState());
          };
        },
        reset() {
          return ({ setState }) => {
            setState(0);
          };
        },
      },
    });

    const extendedActions$ = actions(counter, {
      incrementAndLog(amount: number) {
        return ({ setState, getState, actions: parentActions }) => {
          setState((count) => count + amount);
          parentActions.log('after increment');
          return getState();
        };
      },
      decrementAndReset(amount: number) {
        return ({ setState, actions: parentActions }) => {
          setState((count) => count - amount);
          parentActions.reset();
        };
      },
    });

    const result = extendedActions$.incrementAndLog(5);
    expect(result).toBe(5);
    expect(logSpy).toHaveBeenCalledWith('after increment', 5);

    counter.setState(10);
    extendedActions$.decrementAndReset(3);
    expect(counter.getState()).toBe(0);
  });

  it('should return values from actions', () => {
    const counter = createGlobalState(0);

    const actions$ = actions(counter, {
      incrementAndReturn(amount: number) {
        return ({ setState, getState }) => {
          setState((count) => count + amount);
          return getState();
        };
      },
      getDouble() {
        return ({ getState }) => {
          return getState() * 2;
        };
      },
    });

    const result1 = actions$.incrementAndReturn(5);
    expect(result1).toBe(5);

    const result2 = actions$.getDouble();
    expect(result2).toBe(10);
  });

  // Edge cases: Circular and recursive dependencies
  describe('circular and recursive action dependencies', () => {
    it('should handle direct circular dependencies without infinite loop', () => {
      const counter = createGlobalState(0);
      const callStack: string[] = [];

      const actions$ = actions(counter, {
        actionA(depth: number) {
          return ({ setState }) => {
            callStack.push('A');
            setState((count) => count + 1);
            if (depth > 0) {
              this.actionB(depth - 1);
            }
          };
        },
        actionB(depth: number) {
          return ({ setState }) => {
            callStack.push('B');
            setState((count) => count + 1);
            if (depth > 0) {
              this.actionA(depth - 1);
            }
          };
        },
      });

      actions$.actionA(3);

      expect(callStack).toEqual(['A', 'B', 'A', 'B']);
      expect(counter.getState()).toBe(4);
    });

    it('should handle self-recursive actions with base case', () => {
      const counter = createGlobalState(0);

      const actions$ = actions(counter, {
        recursiveIncrement(times: number) {
          return ({ setState }) => {
            if (times <= 0) return;
            setState((count) => count + 1);
            this.recursiveIncrement(times - 1);
          };
        },
      });

      actions$.recursiveIncrement(5);
      expect(counter.getState()).toBe(5);
    });

    it('should cause stack overflow with unbounded recursion', () => {
      const counter = createGlobalState(0);

      const actions$ = actions(counter, {
        infiniteRecursion() {
          return () => {
            this.infiniteRecursion();
          };
        },
      });

      expect(() => {
        actions$.infiniteRecursion();
      }).toThrow();
    });

    it('should handle indirect circular dependencies (A->B->C->A)', () => {
      const counter = createGlobalState(0);
      const callStack: string[] = [];

      const actions$ = actions(counter, {
        actionA(depth: number) {
          return ({ setState }) => {
            callStack.push('A');
            setState((count) => count + 1);
            if (depth > 0) {
              this.actionB(depth - 1);
            }
          };
        },
        actionB(depth: number) {
          return ({ setState }) => {
            callStack.push('B');
            setState((count) => count + 1);
            if (depth > 0) {
              this.actionC(depth - 1);
            }
          };
        },
        actionC(depth: number) {
          return ({ setState }) => {
            callStack.push('C');
            setState((count) => count + 1);
            if (depth > 0) {
              this.actionA(depth - 1);
            }
          };
        },
      });

      actions$.actionA(5);

      expect(callStack).toEqual(['A', 'B', 'C', 'A', 'B', 'C']);
      expect(counter.getState()).toBe(6);
    });

    it('should handle deeply nested recursive calls', () => {
      const counter = createGlobalState(0);

      const actions$ = actions(counter, {
        deepRecursion(depth: number) {
          return ({ setState }) => {
            setState((count) => count + 1);
            if (depth > 1) {
              this.deepRecursion(depth - 1);
            }
          };
        },
      });

      // Test with reasonably deep recursion
      actions$.deepRecursion(100);
      expect(counter.getState()).toBe(100);
    });

    it('should handle async recursive actions', async () => {
      const counter = createGlobalState(0);

      const actions$ = actions(counter, {
        asyncRecursion(times: number) {
          return async ({ setState }) => {
            if (times <= 0) return;

            await new Promise((resolve) => setTimeout(resolve, 1));
            setState((count) => count + 1);

            await this.asyncRecursion(times - 1);
          };
        },
      });

      await actions$.asyncRecursion(3);
      expect(counter.getState()).toBe(3);
    });

    it('should allow recursion with mutation tracking', () => {
      const store = createGlobalState<number[]>([]);

      const actions$ = actions(store, {
        buildArray(n: number) {
          return ({ setState, getState }) => {
            if (n <= 0) return;
            setState([...getState(), n]);
            this.buildArray(n - 1);
          };
        },
      });

      actions$.buildArray(5);
      expect(store.getState()).toEqual([5, 4, 3, 2, 1]);
    });
  });

  // Using actions during onInit
  describe('actions in onInit callback', () => {
    it('should allow calling derived actions from onInit', () => {
      const initSpy = jest.fn();

      const counter = createGlobalState(0, {
        callbacks: {
          onInit: ({ actions: storeActions }) => {
            initSpy('onInit called', storeActions);
          },
        },
      });

      const actions$ = actions(counter, {
        increment(amount: number) {
          return ({ setState }) => {
            setState((count) => count + amount);
          };
        },
      });

      expect(initSpy).toHaveBeenCalledWith('onInit called', expect.any(Object));
      expect(counter.getState()).toBe(0);

      // Actions work normally after init
      actions$.increment(5);
      expect(counter.getState()).toBe(5);
    });

    it('should allow store with actions to call them in onInit', () => {
      const initSpy = jest.fn();

      const counter = createGlobalState(10, {
        actions: {
          double() {
            return ({ setState, getState }) => {
              setState(getState() * 2);
            };
          },
          log(message: string) {
            return ({ getState }) => {
              initSpy(message, getState());
            };
          },
        },
        callbacks: {
          onInit: ({ actions }) => {
            actions.double();
            actions.log('after double');
          },
        },
      });

      // onInit should have executed the actions
      expect(counter.getState()).toBe(20);
      expect(initSpy).toHaveBeenCalledWith('after double', 20);
    });

    it('should support async actions in onInit', async () => {
      const loadSpy = jest.fn();

      const store = createGlobalState(
        { data: null as string | null, loaded: false },
        {
          actions: {
            loadData() {
              return async ({ setState }) => {
                await new Promise((resolve) => setTimeout(resolve, 10));
                setState({ data: 'loaded data', loaded: true });
                loadSpy('data loaded');
              };
            },
          },
          callbacks: {
            onInit: async ({ actions }) => {
              await actions.loadData();
            },
          },
        },
      );

      // Wait for async initialization
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(store.getState()).toEqual({ data: 'loaded data', loaded: true });
      expect(loadSpy).toHaveBeenCalledWith('data loaded');
    });

    it('should allow derived actions to be used with store that has onInit', () => {
      const initLog: string[] = [];

      type CounterStore = InferAPI<typeof counter>;

      const counter = createGlobalState(0, {
        actions: {
          setToTen() {
            return ({ setState }) => {
              setState(10);
            };
          },
        },
        callbacks: {
          onInit: (api) => {
            const { actions, getState } = api as CounterStore;
            initLog.push(`init start: ${getState()}`);
            actions.setToTen();
            initLog.push(`init after setToTen: ${getState()}`);
          },
        },
      });

      const derivedActions$ = actions(counter, {
        addFive() {
          return ({ setState, getState }) => {
            setState(getState() + 5);
          };
        },
      });

      expect(initLog).toEqual(['init start: 0', 'init after setToTen: 10']);
      expect(counter.getState()).toBe(10);

      derivedActions$.addFive();
      expect(counter.getState()).toBe(15);
    });

    it('should handle onInit with metadata and actions', () => {
      const metadataLog: string[] = [];

      const store = createGlobalState(0, {
        metadata: { initialized: false, version: 0 },
        actions: {
          markInitialized() {
            return ({ setMetadata }) => {
              setMetadata({ initialized: true, version: 1 });
            };
          },
        },
        callbacks: {
          onInit: ({ actions, getMetadata, setState }) => {
            setState(100);
            const meta = getMetadata();
            metadataLog.push(`before: ${JSON.stringify(meta)}`);
            actions.markInitialized();
            const metaAfter = getMetadata();
            metadataLog.push(`after: ${JSON.stringify(metaAfter)}`);
          },
        },
      });

      expect(store.getState()).toBe(100);
      expect(store.getMetadata()).toEqual({ initialized: true, version: 1 });
      expect(metadataLog).toEqual([
        'before: {"initialized":false,"version":0}',
        'after: {"initialized":true,"version":1}',
      ]);
    });

    it('should call onInit before derived actions are available', () => {
      const callOrder: string[] = [];

      const counter = createGlobalState(0, {
        callbacks: {
          onInit: () => {
            callOrder.push('onInit');
          },
        },
      });

      callOrder.push('before derived actions');

      const actions$ = actions(counter, {
        increment() {
          return ({ setState }) => {
            callOrder.push('increment action');
            setState((count) => count + 1);
          };
        },
      });

      callOrder.push('after derived actions');

      actions$.increment();

      expect(callOrder).toEqual([
        'onInit',
        'before derived actions',
        'after derived actions',
        'increment action',
      ]);
    });

    it('should allow actions to be called from onInit using parent actions', () => {
      const actionLog: string[] = [];

      const store = createGlobalState(
        { count: 0, messages: [] as string[] },
        {
          actions: {
            addMessage(msg: string) {
              return ({ setState, getState }) => {
                actionLog.push(`addMessage: ${msg}`);
                setState({
                  ...getState(),
                  messages: [...getState().messages, msg],
                });
              };
            },
            incrementCount() {
              return ({ setState, getState }) => {
                actionLog.push('incrementCount');
                setState({ ...getState(), count: getState().count + 1 });
              };
            },
          },
          callbacks: {
            onInit: ({ actions }) => {
              actionLog.push('onInit start');
              actions.addMessage('initialized');
              actions.incrementCount();
              actionLog.push('onInit end');
            },
          },
        },
      );

      expect(actionLog).toEqual(['onInit start', 'addMessage: initialized', 'incrementCount', 'onInit end']);
      expect(store.getState()).toEqual({
        count: 1,
        messages: ['initialized'],
      });
    });
  });

  // Tests with context stores
  describe('with context stores', () => {
    it('should create actions directly bound to a context store', ({ renderHook }) => {
      type Counter = InferAPI<typeof counter.Context>;

      const counter = createContext(0);

      const makeActions = actions<Counter>()({
        increment(amount: number) {
          return ({ setState }) => {
            setState((count: number) => count + amount);
          };
        },
        decrement(amount: number) {
          return ({ setState }) => {
            setState((count: number) => count - amount);
          };
        },
      });

      const { context, wrapper } = counter.Provider.makeProviderWrapper();

      const { result } = renderHook(() => counter.use(), { wrapper });

      expect(result.current[0]).toBe(0);

      const actions$ = makeActions(context.current);

      act(() => {
        actions$.increment(5);
      });

      expect(result.current[0]).toBe(5);
    });

    it('should work with builder pattern on context stores', ({ renderHook }) => {
      type CounterAPI = InferAPI<typeof counter.Context>;

      const counter = createContext(0);

      const actionsBuilder = actions<CounterAPI>()({
        increment(amount: number) {
          return ({ setState }) => {
            setState((count) => count + amount);
          };
        },
        decrement(amount: number) {
          return ({ setState }) => {
            setState((count) => count - amount);
          };
        },
      });

      const { context, wrapper } = counter.Provider.makeProviderWrapper();

      const { result } = renderHook(() => counter.use(), { wrapper });

      expect(result.current[0]).toBe(0);

      const actions$ = actionsBuilder(context.current);

      act(() => {
        actions$.increment(5);
      });
      expect(result.current[0]).toBe(5);

      act(() => {
        actions$.decrement(3);
      });
      expect(result.current[0]).toBe(2);
    });

    it('should allow actions to call each other using this keyword with context', ({ renderHook }) => {
      const counter = createContext(0);

      const makeActions = actions<InferAPI<typeof counter.Context>>()({
        increment(amount: number) {
          return ({ setState }) => {
            setState((count: number) => count + amount);
          };
        },
        incrementTwice(amount: number) {
          return () => {
            this.increment(amount);
            this.increment(amount);
          };
        },
      });

      const { context, wrapper } = counter.Provider.makeProviderWrapper();

      const { result } = renderHook(() => counter.use(), { wrapper });

      const actions$ = makeActions(context.current);

      act(() => {
        actions$.incrementTwice(5);
      });
      expect(result.current[0]).toBe(10);
    });

    it('should allow actions to access parent context store actions', ({ renderHook }) => {
      const logSpy = jest.fn();

      const counter = createContext(0, {
        actions: {
          log(message: string) {
            return ({ getState }) => {
              logSpy(message, getState());
            };
          },
        },
      });

      const makeActions = actions<InferAPI<typeof counter.Context>>()({
        increment(amount: number) {
          return ({ setState, actions: parentActions }) => {
            setState((count: number) => count + amount);
            parentActions.log('incremented');
          };
        },
      });

      const { context, wrapper } = counter.Provider.makeProviderWrapper();

      renderHook(() => counter.use(), { wrapper });

      const actions$ = makeActions(context.current);

      act(() => {
        actions$.increment(5);
      });

      expect(logSpy).toHaveBeenCalledWith('incremented', 5);
    });

    it('should work with complex state objects in context', ({ renderHook }) => {
      const store = createContext({
        count: 0,
        history: [] as number[],
      });

      const makeActions = actions<InferAPI<typeof store.Context>>()({
        increment(amount: number) {
          return ({ setState, getState }) => {
            const current = getState();
            setState({
              count: current.count + amount,
              history: [...current.history, current.count + amount],
            });
          };
        },
        reset() {
          return ({ setState }) => {
            setState({ count: 0, history: [] });
          };
        },
      });

      const { context, wrapper } = store.Provider.makeProviderWrapper();

      const { result } = renderHook(() => store.use(), { wrapper });

      const actions$ = makeActions(context.current);

      act(() => {
        actions$.increment(5);
      });
      expect(result.current[0]).toEqual({ count: 5, history: [5] });

      act(() => {
        actions$.increment(3);
      });
      expect(result.current[0]).toEqual({ count: 8, history: [5, 8] });

      act(() => {
        actions$.reset();
      });
      expect(result.current[0]).toEqual({ count: 0, history: [] });
    });

    it('should provide access to metadata in context actions', ({ renderHook }) => {
      const counter = createContext(0, {
        metadata: { lastAction: '' },
      });

      const makeActions = actions<InferAPI<typeof counter.Context>>()({
        increment(amount: number) {
          return ({ setState, setMetadata }) => {
            setState((count: number) => count + amount);
            setMetadata({ lastAction: 'increment' });
          };
        },
        decrement(amount: number) {
          return ({ setState, setMetadata }) => {
            setState((count: number) => count - amount);
            setMetadata({ lastAction: 'decrement' });
          };
        },
      });

      const { context, wrapper } = counter.Provider.makeProviderWrapper();

      const { result } = renderHook(() => counter.use(), { wrapper });

      const actions$ = makeActions(context.current);

      act(() => {
        actions$.increment(5);
      });
      expect(result.current[2].lastAction).toBe('increment');

      act(() => {
        actions$.decrement(2);
      });
      expect(result.current[2].lastAction).toBe('decrement');
    });

    it('should allow async actions with context', async ({ renderHook }) => {
      const store = createContext({ data: null as string | null, loading: false });

      const makeActions = actions<InferAPI<typeof store.Context>>()({
        fetchData(id: string) {
          return async ({ setState }) => {
            setState((prev: { data: string | null; loading: boolean }) => ({ ...prev, loading: true }));

            await new Promise((resolve) => setTimeout(resolve, 10));

            setState({ data: `Data for ${id}`, loading: false });
          };
        },
      });

      const { context, wrapper } = store.Provider.makeProviderWrapper();

      const { result } = renderHook(() => store.use(), { wrapper });

      const actions$ = makeActions(context.current);

      let promise: Promise<void>;
      act(() => {
        promise = actions$.fetchData('123');
      });
      expect(result.current[0]).toEqual({ data: null, loading: true });

      await act(async () => {
        await promise!;
      });
      expect(result.current[0]).toEqual({ data: 'Data for 123', loading: false });
    });

    it('should allow actions to subscribe to context state changes', ({ renderHook }) => {
      const counter = createContext(0);
      const subscribeSpy = jest.fn();

      const makeActions = actions<InferAPI<typeof counter.Context>>()({
        watchChanges() {
          return ({ subscribe }) => {
            return subscribe((state) => {
              subscribeSpy(state);
            });
          };
        },
        increment() {
          return ({ setState }) => {
            setState((count: number) => count + 1);
          };
        },
      });

      const { context, wrapper } = counter.Provider.makeProviderWrapper();

      renderHook(() => counter.use(), { wrapper });

      const actions$ = makeActions(context.current);

      const unsubscribe = actions$.watchChanges();

      expect(subscribeSpy).toHaveBeenCalledWith(0);

      act(() => {
        actions$.increment();
      });
      expect(subscribeSpy).toHaveBeenCalledWith(1);

      act(() => {
        actions$.increment();
      });
      expect(subscribeSpy).toHaveBeenCalledWith(2);

      unsubscribe();

      act(() => {
        actions$.increment();
      });
      // Should still be 3 calls since we unsubscribed
      expect(subscribeSpy).toHaveBeenCalledTimes(3);
    });

    it('should work with context stores that have existing actions', ({ renderHook }) => {
      const logSpy = jest.fn();

      const counter = createContext(0, {
        actions: {
          log(message: string) {
            return ({ getState }) => {
              logSpy(message, getState());
            };
          },
          reset() {
            return ({ setState }) => {
              setState(0);
            };
          },
        },
      });

      const makeActions = actions<InferAPI<typeof counter.Context>>()({
        incrementAndLog(amount: number) {
          return ({ setState, getState, actions: parentActions }) => {
            setState((count: number) => count + amount);
            parentActions.log('after increment');
            return getState();
          };
        },
        decrementAndReset(amount: number) {
          return ({ setState, actions: parentActions }) => {
            setState((count: number) => count - amount);
            parentActions.reset();
          };
        },
      });

      const { context, wrapper } = counter.Provider.makeProviderWrapper();

      const { result } = renderHook(() => counter.use(), { wrapper });

      const extendedActions$ = makeActions(context.current);

      let returnValue: number;
      act(() => {
        returnValue = extendedActions$.incrementAndLog(5);
      });
      expect(returnValue!).toBe(5);
      expect(logSpy).toHaveBeenCalledWith('after increment', 5);

      act(() => {
        context.current.setState(10);
      });
      act(() => {
        extendedActions$.decrementAndReset(3);
      });
      expect(result.current[0]).toBe(0);
    });

    it('should return values from context actions', ({ renderHook }) => {
      const counter = createContext(0);

      const makeActions = actions<InferAPI<typeof counter.Context>>()({
        incrementAndReturn(amount: number) {
          return ({ setState, getState }) => {
            setState((count: number) => count + amount);
            return getState();
          };
        },
        getDouble() {
          return ({ getState }) => {
            return getState() * 2;
          };
        },
      });

      const { context, wrapper } = counter.Provider.makeProviderWrapper();

      renderHook(() => counter.use(), { wrapper });

      const actions$ = makeActions(context.current);

      let result1: number;
      act(() => {
        result1 = actions$.incrementAndReturn(5);
      });
      expect(result1!).toBe(5);

      const result2 = actions$.getDouble();
      expect(result2).toBe(10);
    });

    it('should allow builder pattern to be reused across multiple context instances', ({ renderHook }) => {
      const counter1 = createContext(5);
      const counter2 = createContext(10);

      type CounterAPI = InferAPI<typeof counter1.Context>;

      const actionsBuilder = actions<CounterAPI>()({
        double() {
          return ({ setState, getState }) => {
            setState(getState() * 2);
          };
        },
        add(amount: number) {
          return ({ setState, getState }) => {
            setState(getState() + amount);
          };
        },
      });

      const { context: context1, wrapper: wrapper1 } = counter1.Provider.makeProviderWrapper();
      const { context: context2, wrapper: wrapper2 } = counter2.Provider.makeProviderWrapper();

      const { result: result1 } = renderHook(() => counter1.use(), { wrapper: wrapper1 });
      const { result: result2 } = renderHook(() => counter2.use(), { wrapper: wrapper2 });

      const actions1$ = actionsBuilder(context1.current);
      const actions2$ = actionsBuilder(context2.current);

      act(() => {
        actions1$.double();
      });
      expect(result1.current[0]).toBe(10);
      expect(result2.current[0]).toBe(10);

      act(() => {
        actions2$.add(5);
      });
      expect(result1.current[0]).toBe(10);
      expect(result2.current[0]).toBe(15);
    });
  });
});
