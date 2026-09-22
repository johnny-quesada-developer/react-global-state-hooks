import { describe, it, expect } from 'vitest';
import { isActionJson, assertActionJson } from '../ActionJson';
import { ActionTypeJsonEnum, isActionTypeJson } from '../ActionTypeJson';
import { isGlobalStateJson, assertGlobalStateJson } from '../GlobalStateJson';

describe('Schema Validators', () => {
  describe('ActionJson', () => {
    it('should validate correct ActionJson', () => {
      const validAction = {
        globalStateId: 'state-1',
        actionId: 'action-1',
        action: 'increment',
        async: false,
        start: Date.now(),
        timing: 0,
        logs: [],
        actionType: ActionTypeJsonEnum.CUSTOM_ACTION,
      };

      expect(isActionJson(validAction)).toBe(true);
      expect(() => assertActionJson(validAction)).not.toThrow();
    });

    it('should validate ActionJson with logs', () => {
      const validAction = {
        globalStateId: 'state-1',
        actionId: 'action-1',
        action: 'fetch',
        async: true,
        start: 1000,
        timing: 150,
        logs: [
          {
            logId: 'log-1',
            globalStateId: 'state-1',
            actionId: 'action-1',
            payload: { data: 'test' },
            case: 'resolved',
            scope: 'action',
            timestamp: 1150,
            subAction: 'setState',
          },
        ],
        actionType: ActionTypeJsonEnum.CUSTOM_ACTION,
      };

      expect(isActionJson(validAction)).toBe(true);
    });

    it('should validate different action types', () => {
      const types = Object.values(ActionTypeJsonEnum);

      types.forEach((actionType) => {
        const action = {
          globalStateId: 'state-1',
          actionId: 'action-1',
          action: 'test',
          async: false,
          start: 1000,
          timing: 0,
          logs: [],
          actionType,
        };

        expect(isActionJson(action)).toBe(true);
      });
    });
  });

  it.each(['async', 'action', 'callback'])('rejects the unsupported action type %s', (actionType) => {
    expect(isActionTypeJson(actionType)).toBe(false);
  });

  describe('GlobalStateJson', () => {
    it('should validate correct GlobalStateJson', () => {
      const validState = {
        globalStateId: 'state-1',
        name: 'Counter',
        globalStatePath: '/src/counter.ts',
        initialState: { count: 0 },
        actions: {},
        callbacks: [],
        localStorage: null,
        metadata: {},
        isContext: false,
      };

      expect(isGlobalStateJson(validState)).toBe(true);
      expect(() => assertGlobalStateJson(validState)).not.toThrow();
    });

    it('should validate GlobalStateJson with actions', () => {
      const validState = {
        globalStateId: 'state-1',
        name: 'Counter',
        globalStatePath: '/src/counter.ts',
        initialState: { count: 0 },
        actions: {
          increment: { length: 0 },
          add: { length: 1 },
        },
        callbacks: [],
        localStorage: null,
        metadata: {},
        isContext: false,
      };

      expect(isGlobalStateJson(validState)).toBe(true);
    });

    it('should validate GlobalStateJson with callbacks', () => {
      const validState = {
        globalStateId: 'state-1',
        name: 'Counter',
        globalStatePath: '/src/counter.ts',
        initialState: { count: 0 },
        actions: {},
        callbacks: ['onInit', 'onUpdate'],
        localStorage: null,
        metadata: {},
        isContext: false,
      };

      expect(isGlobalStateJson(validState)).toBe(true);
    });

    it('should validate GlobalStateJson with metadata', () => {
      const validState = {
        globalStateId: 'state-1',
        name: 'Counter',
        globalStatePath: '/src/counter.ts',
        initialState: { count: 0 },
        actions: {},
        callbacks: [],
        localStorage: null,
        metadata: {
          version: '1.0.0',
          custom: { nested: 'data' },
        },
        isContext: false,
      };

      expect(isGlobalStateJson(validState)).toBe(true);
    });

    it('should validate different initial state types', () => {
      const states = [{ count: 0 }, [1, 2, 3], 'string state', 42, true, null];

      states.forEach((initialState) => {
        const state = {
          globalStateId: 'state-1',
          name: 'Test',
          globalStatePath: '/test',
          initialState,
          actions: {},
          callbacks: [],
          localStorage: null,
          metadata: {},
          isContext: false,
        };

        expect(isGlobalStateJson(state)).toBe(true);
      });
    });
  });
});
