import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { getGlobalStateMetaPayload } from '../../monkey_patch/monkey_patch.utils';
import type { GlobalStoreParameter } from '../../monkey_patch/tools/react';

describe('getGlobalStateMetaPayload', () => {
  describe('basic state metadata extraction', () => {
    it('should extract minimal state metadata', () => {
      const globalState: GlobalStoreParameter = {
        state: { count: 0 },
        actionsConfig: {},
        callbacks: {},
        metadata: {},
      };

      const result = getGlobalStateMetaPayload({
        globalStatePath: '/src/counter.ts',
        globalState,
        globalStateId: 'state-1',
        args: undefined,
      });

      expect(result.globalStateId).toBe('state-1');
      expect(result.globalStatePath).toBe('/src/counter.ts');
      expect(result.initialState).toEqual({ count: 0 });
      expect(result.actions).toEqual({});
      expect(result.callbacks).toEqual([]);
      expect(result.localStorage).toBeNull();
      expect(result.metadata).toEqual({});
    });

    it('should use _name property if available', () => {
      const globalState: GlobalStoreParameter = {
        _name: 'Counter Store',
        state: { count: 0 },
        actionsConfig: {},
        callbacks: {},
        metadata: {},
      };

      const result = getGlobalStateMetaPayload({
        globalStatePath: '/src/counter.ts',
        globalState,
        globalStateId: 'state-1',
        args: undefined,
      });

      expect(result.name).toBe('Counter Store');
    });

    it('should fallback to globalStateId for name', () => {
      const globalState: GlobalStoreParameter = {
        state: { count: 0 },
        actionsConfig: {},
        callbacks: {},
        metadata: {},
      };

      const result = getGlobalStateMetaPayload({
        globalStatePath: '/src/counter.ts',
        globalState,
        globalStateId: 'state-123',
        args: undefined,
      });

      expect(result.name).toBe('state-123');
    });
  });

  describe('actions extraction', () => {
    it('should extract action configurations', () => {
      const globalState: GlobalStoreParameter = {
        state: { count: 0 },
        actionsConfig: {
          increment: () => {},
          decrement: () => {},
          add: (n: number) => {},
        },
        callbacks: {},
        metadata: {},
      };

      const result = getGlobalStateMetaPayload({
        globalStatePath: '/src/counter.ts',
        globalState,
        globalStateId: 'state-1',
        args: undefined,
      });

      expect(result.actions).toHaveProperty('increment');
      expect(result.actions).toHaveProperty('decrement');
      expect(result.actions).toHaveProperty('add');
      expect(result.actions.increment).toHaveProperty('length');
      expect(result.actions.add.length).toBe(1); // function takes 1 param
    });

    it('should only include function actions', () => {
      const globalState: GlobalStoreParameter = {
        state: { count: 0 },
        actionsConfig: {
          increment: () => {},
          notAFunction: 'string value',
          anotherNonFunction: 123,
          validAction: (a: number, b: number) => {},
        } as any,
        callbacks: {},
        metadata: {},
      };

      const result = getGlobalStateMetaPayload({
        globalStatePath: '/src/counter.ts',
        globalState,
        globalStateId: 'state-1',
        args: undefined,
      });

      expect(result.actions).toHaveProperty('increment');
      expect(result.actions).toHaveProperty('validAction');
      expect(result.actions).not.toHaveProperty('notAFunction');
      expect(result.actions).not.toHaveProperty('anotherNonFunction');
    });

    it('should handle empty actionsConfig', () => {
      const globalState: GlobalStoreParameter = {
        state: { count: 0 },
        actionsConfig: {},
        callbacks: {},
        metadata: {},
      };

      const result = getGlobalStateMetaPayload({
        globalStatePath: '/src/counter.ts',
        globalState,
        globalStateId: 'state-1',
        args: undefined,
      });

      expect(result.actions).toEqual({});
    });

    it('should handle undefined actionsConfig', () => {
      const globalState: GlobalStoreParameter = {
        state: { count: 0 },
        actionsConfig: undefined as any,
        callbacks: {},
        metadata: {},
      };

      const result = getGlobalStateMetaPayload({
        globalStatePath: '/src/counter.ts',
        globalState,
        globalStateId: 'state-1',
        args: undefined,
      });

      expect(result.actions).toEqual({});
    });

    it('should capture function arity (number of parameters)', () => {
      const globalState: GlobalStoreParameter = {
        state: {},
        actionsConfig: {
          noArgs: () => {},
          oneArg: (a: any) => {},
          twoArgs: (a: any, b: any) => {},
          threeArgs: (a: any, b: any, c: any) => {},
        },
        callbacks: {},
        metadata: {},
      };

      const result = getGlobalStateMetaPayload({
        globalStatePath: '/src/test.ts',
        globalState,
        globalStateId: 'state-1',
        args: undefined,
      });

      expect(result.actions.noArgs.length).toBe(0);
      expect(result.actions.oneArg.length).toBe(1);
      expect(result.actions.twoArgs.length).toBe(2);
      expect(result.actions.threeArgs.length).toBe(3);
    });
  });

  describe('callbacks extraction', () => {
    it('should extract callback keys', () => {
      const globalState: GlobalStoreParameter = {
        state: { count: 0 },
        actionsConfig: {},
        callbacks: {
          onInit: () => {},
          onUpdate: () => {},
          onDestroy: () => {},
        },
        metadata: {},
      };

      const result = getGlobalStateMetaPayload({
        globalStatePath: '/src/counter.ts',
        globalState,
        globalStateId: 'state-1',
        args: undefined,
      });

      expect(result.callbacks).toEqual(['onInit', 'onUpdate', 'onDestroy']);
    });

    it('should handle empty callbacks', () => {
      const globalState: GlobalStoreParameter = {
        state: { count: 0 },
        actionsConfig: {},
        callbacks: {},
        metadata: {},
      };

      const result = getGlobalStateMetaPayload({
        globalStatePath: '/src/counter.ts',
        globalState,
        globalStateId: 'state-1',
        args: undefined,
      });

      expect(result.callbacks).toEqual([]);
    });

    it('should handle undefined callbacks', () => {
      const globalState: GlobalStoreParameter = {
        state: { count: 0 },
        actionsConfig: {},
        callbacks: undefined as any,
        metadata: {},
      };

      const result = getGlobalStateMetaPayload({
        globalStatePath: '/src/counter.ts',
        globalState,
        globalStateId: 'state-1',
        args: undefined,
      });

      expect(result.callbacks).toEqual([]);
    });
  });

  describe('metadata handling', () => {
    it('should clone metadata', () => {
      const metadata = {
        version: '1.0.0',
        feature: 'test',
        nested: {
          value: 42,
        },
      };

      const globalState: GlobalStoreParameter = {
        state: { count: 0 },
        actionsConfig: {},
        callbacks: {},
        metadata,
      };

      const result = getGlobalStateMetaPayload({
        globalStatePath: '/src/counter.ts',
        globalState,
        globalStateId: 'state-1',
        args: undefined,
      });

      expect(result.metadata).toEqual(metadata);
      expect(result.metadata).not.toBe(metadata); // Should be a clone
    });

    it('should handle empty metadata', () => {
      const globalState: GlobalStoreParameter = {
        state: { count: 0 },
        actionsConfig: {},
        callbacks: {},
        metadata: {},
      };

      const result = getGlobalStateMetaPayload({
        globalStatePath: '/src/counter.ts',
        globalState,
        globalStateId: 'state-1',
        args: undefined,
      });

      expect(result.metadata).toEqual({});
    });
  });

  describe('initial state handling', () => {
    it('should clone initial state', () => {
      const state = {
        count: 0,
        user: {
          name: 'Test',
          data: [1, 2, 3],
        },
      };

      const globalState: GlobalStoreParameter = {
        state,
        actionsConfig: {},
        callbacks: {},
        metadata: {},
      };

      const result = getGlobalStateMetaPayload({
        globalStatePath: '/src/counter.ts',
        globalState,
        globalStateId: 'state-1',
        args: undefined,
      });

      expect(result.initialState).toEqual(state);
      expect(result.initialState).not.toBe(state); // Should be a clone
    });

    it('should handle primitive initial state', () => {
      const globalState: GlobalStoreParameter = {
        state: 42,
        actionsConfig: {},
        callbacks: {},
        metadata: {},
      };

      const result = getGlobalStateMetaPayload({
        globalStatePath: '/src/counter.ts',
        globalState,
        globalStateId: 'state-1',
        args: undefined,
      });

      expect(result.initialState).toBe(42);
    });

    it('should handle array initial state', () => {
      const state = [1, 2, 3, 4, 5];

      const globalState: GlobalStoreParameter = {
        state,
        actionsConfig: {},
        callbacks: {},
        metadata: {},
      };

      const result = getGlobalStateMetaPayload({
        globalStatePath: '/src/list.ts',
        globalState,
        globalStateId: 'state-1',
        args: undefined,
      });

      expect(result.initialState).toEqual(state);
      expect(result.initialState).not.toBe(state);
    });

    it('should handle null initial state', () => {
      const globalState: GlobalStoreParameter = {
        state: null,
        actionsConfig: {},
        callbacks: {},
        metadata: {},
      };

      const result = getGlobalStateMetaPayload({
        globalStatePath: '/src/nullable.ts',
        globalState,
        globalStateId: 'state-1',
        args: undefined,
      });

      expect(result.initialState).toBeNull();
    });
  });

  describe('localStorage configuration', () => {
    it('should set localStorage to null when no config is provided', () => {
      const globalState: GlobalStoreParameter = {
        state: { count: 0 },
        actionsConfig: {},
        callbacks: {},
        metadata: {},
      };

      const result = getGlobalStateMetaPayload({
        globalStatePath: '/src/counter.ts',
        globalState,
        globalStateId: 'state-1',
        args: undefined,
      });

      expect(result.localStorage).toBeNull();
    });

    it('should extract localStorage key from args when provided', () => {
      const globalState: GlobalStoreParameter = {
        state: { count: 0 },
        actionsConfig: {},
        callbacks: {},
        metadata: {},
      };

      const result = getGlobalStateMetaPayload({
        globalStatePath: '/src/counter.ts',
        globalState,
        globalStateId: 'state-1',
        args: {
          localStorage: {
            key: 'counter-storage',
          },
        },
      });

      expect(result.localStorage).toEqual({ key: 'counter-storage' });
    });

    it('should fallback to globalState.localStorage when args localStorage is missing', () => {
      const globalState: GlobalStoreParameter = {
        state: { count: 0 },
        actionsConfig: {},
        callbacks: {},
        metadata: {},
        localStorage: {
          key: 'store-local-storage',
        },
      };

      const result = getGlobalStateMetaPayload({
        globalStatePath: '/src/counter.ts',
        globalState,
        globalStateId: 'state-1',
        args: undefined,
      });

      expect(result.localStorage).toEqual({ key: 'store-local-storage' });
    });

    it('should ignore invalid localStorage key values', () => {
      const globalState: GlobalStoreParameter = {
        state: { count: 0 },
        actionsConfig: {},
        callbacks: {},
        metadata: {},
      };

      const result = getGlobalStateMetaPayload({
        globalStatePath: '/src/counter.ts',
        globalState,
        globalStateId: 'state-1',
        args: {
          localStorage: {
            key: 123,
          },
        } as unknown,
      });

      expect(result.localStorage).toBeNull();
    });
  });

  describe('complex state scenarios', () => {
    it('should handle full-featured state', () => {
      const globalState: GlobalStoreParameter = {
        _name: 'TodoStore',
        state: {
          todos: [
            { id: 1, text: 'Test 1', completed: false },
            { id: 2, text: 'Test 2', completed: true },
          ],
          filter: 'all',
        },
        actionsConfig: {
          addTodo: (text: string) => {},
          toggleTodo: (id: number) => {},
          removeTodo: (id: number) => {},
          setFilter: (filter: string) => {},
        },
        callbacks: {
          onInit: () => {},
          onTodoAdded: () => {},
        },
        metadata: {
          version: '2.0.0',
          persistEnabled: true,
        },
      };

      const result = getGlobalStateMetaPayload({
        globalStatePath: '/src/stores/todos.ts',
        globalState,
        globalStateId: 'todos-state',
        args: undefined,
      });

      expect(result.globalStateId).toBe('todos-state');
      expect(result.name).toBe('TodoStore');
      expect(result.globalStatePath).toBe('/src/stores/todos.ts');
      expect(result.initialState).toEqual(globalState.state);
      expect(Object.keys(result.actions)).toHaveLength(4);
      expect(result.callbacks).toEqual(['onInit', 'onTodoAdded']);
      expect(result.metadata).toEqual({
        version: '2.0.0',
        persistEnabled: true,
      });
    });

    it('should handle form state', () => {
      const globalState: GlobalStoreParameter = {
        _name: 'FormState',
        state: {
          fields: {
            email: { value: '', touched: false, errors: [] },
            password: { value: '', touched: false, errors: [] },
          },
          isSubmitting: false,
          submitCount: 0,
        },
        actionsConfig: {
          updateField: (name: string, value: string) => {},
          touchField: (name: string) => {},
          submit: () => {},
          reset: () => {},
        },
        callbacks: {
          onFieldChange: () => {},
          onSubmit: () => {},
        },
        metadata: {
          validationSchema: 'yup',
        },
      };

      const result = getGlobalStateMetaPayload({
        globalStatePath: '/src/forms/loginForm.ts',
        globalState,
        globalStateId: 'form-1',
        args: undefined,
      });

      expect(result.name).toBe('FormState');
      expect(result.actions.updateField.length).toBe(2);
      expect(result.actions.touchField.length).toBe(1);
      expect(result.callbacks).toContain('onFieldChange');
      expect(result.callbacks).toContain('onSubmit');
    });

    it('should handle async data state', () => {
      const globalState: GlobalStoreParameter = {
        state: {
          data: null,
          loading: false,
          error: null,
          lastFetch: null,
        },
        actionsConfig: {
          fetch: () => {},
          refetch: () => {},
          reset: () => {},
        },
        callbacks: {
          onFetchStart: () => {},
          onFetchSuccess: () => {},
          onFetchError: () => {},
        },
        metadata: {
          endpoint: '/api/users',
          cacheTime: 5000,
        },
      };

      const result = getGlobalStateMetaPayload({
        globalStatePath: '/src/api/users.ts',
        globalState,
        globalStateId: 'api-users',
        args: undefined,
      });

      expect(result.globalStateId).toBe('api-users');
      expect(result.callbacks).toHaveLength(3);
      expect(result.metadata.endpoint).toBe('/api/users');
    });
  });

  describe('edge cases', () => {
    it('should handle state with symbol keys', () => {
      const sym = Symbol('test');
      const globalState: GlobalStoreParameter = {
        state: {
          [sym]: 'symbol value',
          regular: 'regular value',
        },
        actionsConfig: {},
        callbacks: {},
        metadata: {},
      };

      const result = getGlobalStateMetaPayload({
        globalStatePath: '/src/test.ts',
        globalState,
        globalStateId: 'state-1',
        args: undefined,
      });

      // softClone should handle symbols
      expect(result.initialState).toBeDefined();
    });

    it('should handle state with circular references', () => {
      const state: any = { a: 1 };
      state.self = state;

      const globalState: GlobalStoreParameter = {
        state,
        actionsConfig: {},
        callbacks: {},
        metadata: {},
      };

      // softClone should handle (or throw for) circular references
      expect(() => {
        getGlobalStateMetaPayload({
          globalStatePath: '/src/test.ts',
          globalState,
          globalStateId: 'state-1',
          args: undefined,
        });
      }).not.toThrow();
    });

    it('should handle very large action configs', () => {
      const actionsConfig: Record<string, () => void> = {};
      for (let i = 0; i < 100; i++) {
        actionsConfig[`action${i}`] = () => {};
      }

      const globalState: GlobalStoreParameter = {
        state: {},
        actionsConfig,
        callbacks: {},
        metadata: {},
      };

      const result = getGlobalStateMetaPayload({
        globalStatePath: '/src/test.ts',
        globalState,
        globalStateId: 'state-1',
        args: undefined,
      });

      expect(Object.keys(result.actions)).toHaveLength(100);
    });
  });
});
