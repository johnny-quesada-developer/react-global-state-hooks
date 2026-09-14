import { describe, it, expect } from 'vitest';
import { assertActionLogJson, isActionLogJson } from '../ActionLogJson';
import { SubActionJsonEnum } from '../SubActionJson';

describe('ActionLogJson schema - real world scenarios', () => {
  describe('lifecycle action logs', () => {
    it('should validate initial state action log', () => {
      const initLog = {
        logId: 'action-log:lifecycle-1' as any,
        globalStateId: 'state:counter',
        actionId: 'action:init' as any,
        payload: { initialValue: 0 },
        case: 'resolved' as const,
        scope: 'lifecycle',
        timestamp: 1000,
        subAction: null,
      };

      expect(isActionLogJson(initLog)).toBe(true);
      expect(() => assertActionLogJson(initLog)).not.toThrow();
    });

    it('should validate setState action logs', () => {
      const setStateLog = {
        logId: 'action-log:state-1' as any,
        globalStateId: 'state:counter',
        actionId: 'action:increment' as any,
        payload: { by: 1 },
        case: 'resolved' as const,
        scope: 'action',
        timestamp: 2000,
        subAction: SubActionJsonEnum.setState,
      };

      expect(isActionLogJson(setStateLog)).toBe(true);
      expect(() => assertActionLogJson(setStateLog)).not.toThrow();
    });

    it('should validate rejected action logs with error payload', () => {
      const rejectedLog = {
        logId: 'action-log:error-1' as any,
        globalStateId: 'state:async',
        actionId: 'action:fetchData' as any,
        payload: { error: 'Network timeout', code: 'ECONNABORTED' },
        case: 'rejected' as const,
        scope: 'action',
        timestamp: 3000,
        subAction: null,
      };

      expect(isActionLogJson(rejectedLog)).toBe(true);
      expect(() => assertActionLogJson(rejectedLog)).not.toThrow();
    });

    it('should validate pending action logs', () => {
      const pendingLog = {
        logId: 'action-log:pending-1' as any,
        globalStateId: 'state:loading',
        actionId: 'action:fetch' as any,
        payload: { url: '/api/data' },
        case: 'pending' as const,
        scope: 'action',
        timestamp: 1500,
        subAction: null,
      };

      expect(isActionLogJson(pendingLog)).toBe(true);
    });
  });

  describe('callback action logs', () => {
    it('should validate callback action logs', () => {
      const callbackLog = {
        logId: 'action-log:callback-1' as any,
        globalStateId: 'state:notifications',
        actionId: 'action:onStateChange' as any,
        payload: { previousState: {}, newState: { count: 1 } },
        case: 'resolved' as const,
        scope: 'callback',
        timestamp: 2500,
        subAction: SubActionJsonEnum.setState,
      };

      expect(isActionLogJson(callbackLog)).toBe(true);
    });
  });

  describe('complex payload scenarios', () => {
    it('should handle complex nested payloads', () => {
      const complexLog = {
        logId: 'action-log:complex-1' as any,
        globalStateId: 'state:form',
        actionId: 'action:submitForm' as any,
        payload: {
          form: {
            fields: {
              email: { value: 'test@example.com', touched: true, error: null },
              password: { value: '***', touched: true, error: null },
            },
            isSubmitting: false,
            submitCount: 1,
          },
          response: {
            status: 200,
            data: { id: 123, message: 'Success' },
          },
        },
        case: 'resolved' as const,
        scope: 'action',
        timestamp: 5000,
        subAction: SubActionJsonEnum.setState,
      };

      expect(isActionLogJson(complexLog)).toBe(true);
      expect(() => assertActionLogJson(complexLog)).not.toThrow();
    });

    it('should handle array payloads', () => {
      const arrayLog = {
        logId: 'action-log:array-1' as any,
        globalStateId: 'state:todos',
        actionId: 'action:addTodo' as any,
        payload: {
          todos: [
            { id: 1, title: 'Learn React', completed: true },
            { id: 2, title: 'Build App', completed: false },
          ],
          newTodo: { id: 3, title: 'Deploy', completed: false },
        },
        case: 'resolved' as const,
        scope: 'action',
        timestamp: 6000,
        subAction: SubActionJsonEnum.setState,
      };

      expect(isActionLogJson(arrayLog)).toBe(true);
    });

    it('should handle null payload', () => {
      const nullPayloadLog = {
        logId: 'action-log:null-1' as any,
        globalStateId: 'state:reset',
        actionId: 'action:reset' as any,
        payload: null,
        case: 'resolved' as const,
        scope: 'action',
        timestamp: 7000,
        subAction: null,
      };

      expect(isActionLogJson(nullPayloadLog)).toBe(true);
    });
  });

  describe('timeline simulation', () => {
    it('should validate realistic action sequence', () => {
      const sequence: any[] = [
        // Init
        {
          logId: 'action-log:init' as any,
          globalStateId: 'state:async',
          actionId: 'action:init' as any,
          payload: { initializing: true },
          case: 'resolved' as const,
          scope: 'lifecycle',
          timestamp: 1000,
          subAction: null,
        },
        // Fetch start (pending)
        {
          logId: 'action-log:fetch-1' as any,
          globalStateId: 'state:async',
          actionId: 'action:fetch' as any,
          payload: { url: '/api/users' },
          case: 'pending' as const,
          scope: 'action',
          timestamp: 2000,
          subAction: null,
        },
        // Fetch success (resolved)
        {
          logId: 'action-log:fetch-2' as any,
          globalStateId: 'state:async',
          actionId: 'action:fetch' as any,
          payload: { data: [{ id: 1, name: 'Alice' }], error: null },
          case: 'resolved' as const,
          scope: 'action',
          timestamp: 3000,
          subAction: SubActionJsonEnum.setState,
        },
        // On state change callback
        {
          logId: 'action-log:callback-1' as any,
          globalStateId: 'state:async',
          actionId: 'action:onDataChange' as any,
          payload: { triggeredBy: 'state update' },
          case: 'resolved' as const,
          scope: 'callback',
          timestamp: 3100,
          subAction: null,
        },
      ];

      sequence.forEach((log) => {
        expect(isActionLogJson(log)).toBe(true);
        if (!isActionLogJson(log)) {
          throw new Error(`Log ${log.logId} failed validation`);
        }
      });
    });
  });

  describe('validation in real scenarios', () => {
    it('should correctly validate properly formed logs', () => {
      const properLog = {
        logId: 'action-log:proper-1' as any,
        globalStateId: 'state:test',
        actionId: 'action:test' as any,
        payload: { test: 'data' },
        case: 'resolved' as const,
        scope: 'action',
        timestamp: 1000,
        subAction: null,
      };

      expect(isActionLogJson(properLog)).toBe(true);
      expect(() => assertActionLogJson(properLog)).not.toThrow();
    });

    it('should accept various payload types', () => {
      const logs = [
        {
          logId: 'action-log:1' as any,
          globalStateId: 'state:1',
          actionId: 'action:1' as any,
          payload: null,
          case: 'resolved' as const,
          scope: 'action',
          timestamp: 1000,
          subAction: null,
        },
        {
          logId: 'action-log:2' as any,
          globalStateId: 'state:2',
          actionId: 'action:2' as any,
          payload: { any: 'value', deeply: { nested: { structure: true } } },
          case: 'resolved' as const,
          scope: 'action',
          timestamp: 2000,
          subAction: null,
        },
        {
          logId: 'action-log:3' as any,
          globalStateId: 'state:3',
          actionId: 'action:3' as any,
          payload: [1, 2, 3, 'array', { item: 'in array' }],
          case: 'resolved' as const,
          scope: 'action',
          timestamp: 3000,
          subAction: null,
        },
      ];

      logs.forEach((log) => {
        expect(isActionLogJson(log)).toBe(true);
      });
    });
  });
});
