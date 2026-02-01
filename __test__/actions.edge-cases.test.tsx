import { type Any, createGlobalState, actions, InferAPI } from '..';
import it from './$it';

describe('actions - Error Handling', () => {
  it('should throw error when action config returns non-function', () => {
    const counter = createGlobalState(0);

    const actions$ = actions(counter, {
      badAction() {
        return 'not a function' as Any;
      },
    });

    expect(() => {
      actions$.badAction();
    }).toThrow();
  });

  it('should throw error when action config returns null', () => {
    const counter = createGlobalState(0);

    const actions$ = actions(counter, {
      nullAction() {
        return null as Any;
      },
    });

    expect(() => {
      actions$.nullAction();
    }).toThrow();
  });

  it('should throw error when action config returns undefined', () => {
    const counter = createGlobalState(0);

    const actions$ = actions(counter, {
      undefinedAction() {
        return undefined as Any;
      },
    });

    expect(() => {
      actions$.undefinedAction();
    }).toThrow();
  });

  it('should throw error when action config returns number', () => {
    const counter = createGlobalState(0);

    const actions$ = actions(counter, {
      numberAction() {
        return 42 as Any;
      },
    });

    expect(() => {
      actions$.numberAction();
    }).toThrow();
  });

  it('should handle action throwing error during execution', () => {
    const counter = createGlobalState(0);

    const actions$ = actions(counter, {
      errorAction() {
        return () => {
          throw new Error('Action error');
        };
      },
    });

    expect(() => {
      actions$.errorAction();
    }).toThrow('Action error');
  });

  it('should handle async action rejecting', async () => {
    const counter = createGlobalState(0);

    const actions$ = actions(counter, {
      rejectAction() {
        return async () => {
          throw new Error('Async error');
        };
      },
    });

    await expect(actions$.rejectAction()).rejects.toThrow('Async error');
  });
});

describe('actions - Edge Cases', () => {
  it('should handle empty actions object', () => {
    const counter = createGlobalState(0);

    const actions$ = actions(counter, {});

    expect(actions$).toEqual({});
    expect(Object.keys(actions$)).toHaveLength(0);
  });

  it('should handle actions with no parameters', () => {
    const counter = createGlobalState(0);

    const actions$ = actions(counter, {
      increment() {
        return ({ setState, getState }) => {
          setState(getState() + 1);
        };
      },
    });

    actions$.increment();
    expect(counter.getState()).toBe(1);
  });

  it('should handle actions with optional parameters not provided', () => {
    const counter = createGlobalState(0);

    const actions$ = actions(counter, {
      add(amount: number = 1) {
        return ({ setState, getState }) => {
          setState(getState() + amount);
        };
      },
    });

    actions$.add();
    expect(counter.getState()).toBe(1);

    actions$.add(5);
    expect(counter.getState()).toBe(6);
  });

  it('should handle actions with rest parameters', () => {
    const counter = createGlobalState(0);

    const actions$ = actions(counter, {
      addMultiple(...amounts: number[]) {
        return ({ setState, getState }) => {
          const sum = amounts.reduce((acc, val) => acc + val, 0);
          setState(getState() + sum);
        };
      },
    });

    actions$.addMultiple(1, 2, 3, 4, 5);
    expect(counter.getState()).toBe(15);
  });

  it('should handle actions returning undefined', () => {
    const counter = createGlobalState(0);

    const actions$ = actions(counter, {
      incrementNoReturn() {
        return ({ setState, getState }) => {
          setState(getState() + 1);
          // no return
        };
      },
    });

    const result = actions$.incrementNoReturn();
    expect(result).toBeUndefined();
    expect(counter.getState()).toBe(1);
  });

  it('should handle builder pattern called without actions config', () => {
    type CounterAPI = InferAPI<typeof counter>;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const counter = createGlobalState(0);

    const actionsBuilder = actions<CounterAPI>();

    expect(actionsBuilder).toBeInstanceOf(Function);
  });

  it('should handle actions with complex parameter types', () => {
    type ComplexParam = {
      id: number;
      data: { value: string; tags: string[] };
      callback?: (result: string) => void;
    };

    const store = createGlobalState<string[]>([]);

    const actions$ = actions(store, {
      processComplex(param: ComplexParam) {
        return ({ setState }) => {
          const result = `${param.id}:${param.data.value}`;
          setState((prev) => [...prev, result]);
          param.callback?.(result);
          return result;
        };
      },
    });

    const callbackSpy = jest.fn();

    const result = actions$.processComplex({
      id: 1,
      data: { value: 'test', tags: ['a', 'b'] },
      callback: callbackSpy,
    });

    expect(result).toBe('1:test');
    expect(callbackSpy).toHaveBeenCalledWith('1:test');
    expect(store.getState()).toEqual(['1:test']);
  });
});

describe('actions - Metadata Operations', () => {
  it('should handle setMetadata with function updater in actions', () => {
    const counter = createGlobalState(0, {
      metadata: { count: 0, lastAction: '' },
    });

    const actions$ = actions(counter, {
      increment() {
        return ({ setState, setMetadata, getState }) => {
          setState(getState() + 1);
          setMetadata((prev) => ({
            count: prev.count + 1,
            lastAction: 'increment',
          }));
        };
      },
      decrement() {
        return ({ setState, setMetadata, getState }) => {
          setState(getState() - 1);
          setMetadata((prev) => ({
            count: prev.count + 1,
            lastAction: 'decrement',
          }));
        };
      },
    });

    actions$.increment();
    expect(counter.getMetadata()).toEqual({ count: 1, lastAction: 'increment' });

    actions$.decrement();
    expect(counter.getMetadata()).toEqual({ count: 2, lastAction: 'decrement' });
  });

  it('should handle getMetadata returning complex types', () => {
    const store = createGlobalState(0, {
      metadata: {
        history: [] as { action: string; timestamp: number }[],
        stats: { total: 0, increments: 0, decrements: 0 },
      },
    });

    const actions$ = actions(store, {
      logAction(actionName: string) {
        return ({ setMetadata, getMetadata }) => {
          const current = getMetadata();
          setMetadata({
            history: [...current.history, { action: actionName, timestamp: Date.now() }],
            stats: {
              ...current.stats,
              total: current.stats.total + 1,
              increments:
                actionName === 'increment' ? current.stats.increments + 1 : current.stats.increments,
              decrements:
                actionName === 'decrement' ? current.stats.decrements + 1 : current.stats.decrements,
            },
          });
        };
      },
    });

    actions$.logAction('increment');
    actions$.logAction('increment');
    actions$.logAction('decrement');

    const metadata = store.getMetadata();
    expect(metadata.history).toHaveLength(3);
    expect(metadata.stats.total).toBe(3);
    expect(metadata.stats.increments).toBe(2);
    expect(metadata.stats.decrements).toBe(1);
  });

  it('should handle actions modifying metadata multiple times', () => {
    const store = createGlobalState(0, {
      metadata: { value: 0 },
    });

    const actions$ = actions(store, {
      multiUpdate() {
        return ({ setMetadata }) => {
          setMetadata({ value: 1 });
          setMetadata({ value: 2 });
          setMetadata({ value: 3 });
        };
      },
    });

    actions$.multiUpdate();
    expect(store.getMetadata().value).toBe(3);
  });
});

describe('actions - Subscribe in Actions', () => {
  it('should allow actions to use subscribe with selector', () => {
    const store = createGlobalState({ count: 0, name: 'test' });
    const subscribeSpy = jest.fn();

    const actions$ = actions(store, {
      watchCount() {
        return ({ subscribe }) => {
          return subscribe(
            (state) => state.count,
            (count) => {
              subscribeSpy(count);
            },
          );
        };
      },
      increment() {
        return ({ setState, getState }) => {
          setState({ ...getState(), count: getState().count + 1 });
        };
      },
      changeName(name: string) {
        return ({ setState, getState }) => {
          setState({ ...getState(), name });
        };
      },
    });

    const unsubscribe = actions$.watchCount();

    expect(subscribeSpy).toHaveBeenCalledWith(0);

    actions$.increment();
    expect(subscribeSpy).toHaveBeenCalledWith(1);

    // Changing name shouldn't trigger count subscription
    actions$.changeName('new name');
    expect(subscribeSpy).toHaveBeenCalledTimes(2); // Still only 2 calls

    unsubscribe();
  });

  it('should allow actions to create multiple subscriptions', () => {
    const store = createGlobalState({ a: 1, b: 2 });
    const spyA = jest.fn();
    const spyB = jest.fn();

    const actions$ = actions(store, {
      watchBoth() {
        return ({ subscribe }) => {
          const unsubA = subscribe(
            (state) => state.a,
            (a) => spyA(a),
          );
          const unsubB = subscribe(
            (state) => state.b,
            (b) => spyB(b),
          );

          return () => {
            unsubA();
            unsubB();
          };
        };
      },
      updateA(value: number) {
        return ({ setState, getState }) => {
          setState({ ...getState(), a: value });
        };
      },
      updateB(value: number) {
        return ({ setState, getState }) => {
          setState({ ...getState(), b: value });
        };
      },
    });

    const unsubscribe = actions$.watchBoth();

    expect(spyA).toHaveBeenCalledWith(1);
    expect(spyB).toHaveBeenCalledWith(2);

    actions$.updateA(10);
    expect(spyA).toHaveBeenCalledWith(10);
    expect(spyB).toHaveBeenCalledTimes(1); // B not called again

    actions$.updateB(20);
    expect(spyB).toHaveBeenCalledWith(20);
    expect(spyA).toHaveBeenCalledTimes(2); // A not called again

    unsubscribe();

    actions$.updateA(100);
    expect(spyA).toHaveBeenCalledTimes(2); // No new calls after unsubscribe
  });

  it('should handle subscribe with skipFirst option in actions', () => {
    const store = createGlobalState(0);
    const subscribeSpy = jest.fn();

    const actions$ = actions(store, {
      watchWithSkip() {
        return ({ subscribe }) => {
          return subscribe(subscribeSpy, { skipFirst: true });
        };
      },
      increment() {
        return ({ setState, getState }) => {
          setState(getState() + 1);
        };
      },
    });

    const unsubscribe = actions$.watchWithSkip();

    expect(subscribeSpy).not.toHaveBeenCalled();

    actions$.increment();
    expect(subscribeSpy).toHaveBeenCalledWith(1);

    unsubscribe();
  });
});

describe('actions - Type Safety and Edge Cases', () => {
  it('should preserve action parameter types', () => {
    const store = createGlobalState(0);

    const actions$ = actions(store, {
      add(a: number, b: number) {
        return ({ setState, getState }) => {
          setState(getState() + a + b);
          return a + b;
        };
      },
    });

    const result: number = actions$.add(5, 10);
    expect(result).toBe(15);
    expect(store.getState()).toBe(15);
  });

  it('should handle actions that setState multiple times', () => {
    const store = createGlobalState(0);
    const stateChanges: number[] = [];

    store.subscribe((state) => {
      stateChanges.push(state);
    });

    const actions$ = actions(store, {
      multiSet() {
        return ({ setState }) => {
          setState(1);
          setState(2);
          setState(3);
        };
      },
    });

    actions$.multiSet();
    expect(store.getState()).toBe(3);
    expect(stateChanges).toEqual([0, 1, 2, 3]);
  });

  it('should handle builder pattern with different store types', () => {
    const stringActionsBuilder = actions<InferAPI<typeof stringStore>>()({
      append(text: string) {
        return ({ setState, getState }) => {
          setState(getState() + text);
        };
      },
    });

    const stringStore = createGlobalState('hello');
    const stringActions = stringActionsBuilder(stringStore);

    stringActions.append(' world');
    expect(stringStore.getState()).toBe('hello world');

    const numberStore = createGlobalState(0);
    const numberActionsBuilder = actions<InferAPI<typeof numberStore>>()({
      multiply(factor: number) {
        return ({ setState, getState }) => {
          setState(getState() * factor);
        };
      },
    });

    const numberActions = numberActionsBuilder(numberStore);
    numberActions.multiply(5);
    expect(numberStore.getState()).toBe(0);

    numberStore.setState(10);
    numberActions.multiply(2);
    expect(numberStore.getState()).toBe(20);
  });

  it('should handle actions accessing stale getState', () => {
    const store = createGlobalState(0);

    const actions$ = actions(store, {
      incrementThenGetStale() {
        return ({ setState, getState }) => {
          const beforeState = getState();
          setState((prev) => prev + 1);
          const afterState = getState();

          return { beforeState, afterState };
        };
      },
    });

    const result = actions$.incrementThenGetStale();
    expect(result.beforeState).toBe(0);
    expect(result.afterState).toBe(1);
  });
});
