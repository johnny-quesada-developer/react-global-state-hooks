import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Any } from 'react-global-state-hooks';
import sendMessageFromMonkeyPath from '../src/sendMessageFromMonkeyPath';
import type { MonkeyPathMessage } from '../src/schema/MonkeyPathMessageJson';
import { SubActionJsonEnum } from '../src/schema/SubActionJson';
import { BuildTypeJsonEnum } from '../src/schema/BuildTypeJson';
import { ActionTypeJsonEnum } from '../src/schema/ActionTypeJson';

describe('sendMessageFromMonkeyPath', () => {
  let postMessageSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    postMessageSpy = vi.fn();
    global.window = {
      postMessage: postMessageSpy,
    } as Any;
    global.performance = {
      now: () => 123.456,
    } as Any;
  });

  describe('message validation and formatting', () => {
    it('should send ADD_GLOBAL_STATE message correctly', () => {
      const message: MonkeyPathMessage = {
        id: 'msg-1',
        action: 'ADD_GLOBAL_STATE',
        payload: {
          globalStateId: 'state-1',
          name: 'Counter',
          globalStatePath: '/src/counter.ts',
          initialState: { count: 0 },
          actions: {},
          callbacks: [],
          localStorage: null,
          metadata: {},
          isContext: false,
        },
      };

      sendMessageFromMonkeyPath(message);

      expect(postMessageSpy).toHaveBeenCalledTimes(1);
      const sentMessage = postMessageSpy.mock.calls[0][0];

      expect(sentMessage.id).toBe('msg-1');
      expect(sentMessage.action).toBe('monkey-patch/ADD_GLOBAL_STATE');
      expect(sentMessage.timestamp).toBe(123.456);
      expect(sentMessage.payload).toBeDefined();
    });

    it('should send START_ACTION message correctly', () => {
      const message: MonkeyPathMessage = {
        id: 'msg-2',
        action: 'START_ACTION',
        payload: {
          globalStateId: 'state-1',
          actionId: 'action:1',
          action: 'increment',
          async: false,
          start: Date.now(),
          timing: 0,
          logs: [],
          actionType: ActionTypeJsonEnum.CUSTOM_ACTION,
        },
      };

      sendMessageFromMonkeyPath(message);

      expect(postMessageSpy).toHaveBeenCalledTimes(1);
      const sentMessage = postMessageSpy.mock.calls[0][0];

      expect(sentMessage.action).toBe('monkey-patch/START_ACTION');
      expect(sentMessage.payload).toBeDefined();
    });

    it('should send ADD_ACTION_LOG message correctly', () => {
      const message: MonkeyPathMessage = {
        id: 'msg-3',
        action: 'ADD_ACTION_LOG',
        payload: {
          logId: 'action-log:1',
          globalStateId: 'state-1',
          actionId: 'action:1',
          payload: { count: 1 },
          case: 'resolved',
          scope: 'action',
          timestamp: Date.now(),
          subAction: SubActionJsonEnum.setState,
        },
      };

      sendMessageFromMonkeyPath(message);

      expect(postMessageSpy).toHaveBeenCalledTimes(1);
      const sentMessage = postMessageSpy.mock.calls[0][0];

      expect(sentMessage.action).toBe('monkey-patch/ADD_ACTION_LOG');
    });

    it('should send UPDATE_ACTION message correctly', () => {
      const message: MonkeyPathMessage = {
        id: 'msg-4',
        action: 'UPDATE_ACTION',
        payload: {
          globalStateId: 'state-1',
          actionId: 'action:1',
          timing: 150,
        },
      };

      sendMessageFromMonkeyPath(message);

      expect(postMessageSpy).toHaveBeenCalledTimes(1);
      const sentMessage = postMessageSpy.mock.calls[0][0];

      expect(sentMessage.action).toBe('monkey-patch/UPDATE_ACTION');
    });

    it('should send CLEAR_GLOBAL_STATES message correctly', () => {
      const message: MonkeyPathMessage = {
        id: 'msg-5',
        action: 'CLEAR_GLOBAL_STATES',
        payload: {
          globalStatePath: '/src/counter.ts',
        },
      };

      sendMessageFromMonkeyPath(message);

      expect(postMessageSpy).toHaveBeenCalledTimes(1);
      const sentMessage = postMessageSpy.mock.calls[0][0];

      expect(sentMessage.action).toBe('monkey-patch/CLEAR_GLOBAL_STATES');
      expect(sentMessage.payload).toBeDefined();
      // Payload is serialized, check it exists
      expect(typeof sentMessage.payload).toBe('string');
    });

    it('should send DELETE_GLOBAL_STATE message correctly', () => {
      const message: MonkeyPathMessage = {
        id: 'msg-6',
        action: 'DELETE_GLOBAL_STATE',
        payload: {
          globalStateId: 'state-1',
        },
      };

      sendMessageFromMonkeyPath(message);

      expect(postMessageSpy).toHaveBeenCalledTimes(1);
      const sentMessage = postMessageSpy.mock.calls[0][0];

      expect(sentMessage.action).toBe('monkey-patch/DELETE_GLOBAL_STATE');
    });

    it('should send SET_REACT_BUILD_TYPE message correctly', () => {
      const message: MonkeyPathMessage = {
        id: 'msg-7',
        action: 'SET_REACT_BUILD_TYPE',
        payload: {
          buildType: BuildTypeJsonEnum.development,
        },
      };

      sendMessageFromMonkeyPath(message);

      expect(postMessageSpy).toHaveBeenCalledTimes(1);
      const sentMessage = postMessageSpy.mock.calls[0][0];

      expect(sentMessage.action).toBe('monkey-patch/SET_REACT_BUILD_TYPE');
      expect(sentMessage.payload).toBeDefined();
    });
  });

  describe('message format validation', () => {
    it('should throw for invalid message (missing required fields)', () => {
      const invalidMessage = {
        id: 'msg-1',
        // missing action
        payload: {},
      } as Any;

      expect(() => sendMessageFromMonkeyPath(invalidMessage)).toThrow();
    });

    it('should throw for invalid action type', () => {
      const invalidMessage = {
        id: 'msg-1',
        action: 'INVALID_ACTION',
        payload: {},
      } as Any;

      expect(() => sendMessageFromMonkeyPath(invalidMessage)).toThrow();
    });

    it('should validate payload structure for ADD_GLOBAL_STATE', () => {
      const invalidMessage = {
        id: 'msg-1',
        action: 'ADD_GLOBAL_STATE',
        payload: {
          // missing required fields like name, globalStatePath, etc
          globalStateId: 'state-1',
        },
      } as Any;

      expect(() => sendMessageFromMonkeyPath(invalidMessage)).toThrow();
    });
  });

  describe('non-serializable value handling', () => {
    it('should format payload to store (handle non-serializable values)', () => {
      const func = () => 'test';
      const message: MonkeyPathMessage = {
        id: 'msg-1',
        action: 'ADD_GLOBAL_STATE',
        payload: {
          globalStateId: 'state-1',
          name: 'State with function',
          globalStatePath: '/src/state.ts',
          initialState: { value: 1, fn: func } as Any,
          actions: {},
          callbacks: [],
          localStorage: null,
          metadata: {},
          isContext: false,
        },
      };

      sendMessageFromMonkeyPath(message);

      expect(postMessageSpy).toHaveBeenCalledTimes(1);
      const sentMessage = postMessageSpy.mock.calls[0][0];

      // Payload should be serialized
      expect(sentMessage.payload).toBeDefined();
      expect(typeof sentMessage.payload).toBe('string');
    });

    it('should handle Date objects in payload', () => {
      const date = new Date('2026-04-18');
      const message: MonkeyPathMessage = {
        id: 'msg-1',
        action: 'ADD_ACTION_LOG',
        payload: {
          logId: 'action-log:1',
          globalStateId: 'state-1',
          actionId: 'action:1',
          payload: { timestamp: date } as Any,
          case: 'resolved',
          scope: 'action',
          timestamp: Date.now(),
          subAction: null,
        },
      };

      sendMessageFromMonkeyPath(message);

      expect(postMessageSpy).toHaveBeenCalledTimes(1);
      const sentMessage = postMessageSpy.mock.calls[0][0];

      // Payload should be serialized
      expect(sentMessage.payload).toBeDefined();
      expect(typeof sentMessage.payload).toBe('string');
    });

    it('should handle nested non-serializable values', () => {
      const message: MonkeyPathMessage = {
        id: 'msg-1',
        action: 'ADD_ACTION_LOG',
        payload: {
          logId: 'action-log:1',
          globalStateId: 'state-1',
          actionId: 'action:1',
          payload: {
            data: {
              nested: {
                fn: () => 'nested function',
              },
            },
          } as Any,
          case: 'resolved',
          scope: 'action',
          timestamp: Date.now(),
          subAction: null,
        },
      };

      sendMessageFromMonkeyPath(message);

      expect(postMessageSpy).toHaveBeenCalledTimes(1);
      // Should not throw and should handle nested function
      expect(postMessageSpy).toHaveBeenCalled();
    });
  });

  describe('timestamp injection', () => {
    it('should inject performance.now() timestamp', () => {
      const message: MonkeyPathMessage = {
        id: 'msg-1',
        action: 'ADD_GLOBAL_STATE',
        payload: {
          globalStateId: 'state-1',
          name: 'Test',
          globalStatePath: '/test',
          initialState: {},
          actions: {},
          callbacks: [],
          localStorage: null,
          metadata: {},
          isContext: false,
        },
      };

      sendMessageFromMonkeyPath(message);

      const sentMessage = postMessageSpy.mock.calls[0][0];
      expect(sentMessage.timestamp).toBe(123.456);
    });

    it('should use performance.now() for accurate timing', () => {
      let counter = 100;
      global.performance = {
        now: () => counter++,
      } as Any;

      const message: MonkeyPathMessage = {
        id: 'msg-1',
        action: 'ADD_GLOBAL_STATE',
        payload: {
          globalStateId: 'state-1',
          name: 'Test',
          globalStatePath: '/test',
          initialState: {},
          actions: {},
          callbacks: [],
          localStorage: null,
          metadata: {},
          isContext: false,
        },
      };

      sendMessageFromMonkeyPath(message);
      const firstTimestamp = postMessageSpy.mock.calls[0][0].timestamp;

      sendMessageFromMonkeyPath(message);
      const secondTimestamp = postMessageSpy.mock.calls[1][0].timestamp;

      expect(secondTimestamp).toBeGreaterThan(firstTimestamp);
    });
  });

  describe('complex state scenarios', () => {
    it('should handle complex nested state with arrays and objects', () => {
      const message: MonkeyPathMessage = {
        id: 'msg-1',
        action: 'ADD_GLOBAL_STATE',
        payload: {
          globalStateId: 'state-1',
          name: 'Complex State',
          globalStatePath: '/src/complex.ts',
          initialState: {
            users: [
              { id: 1, name: 'Alice', roles: ['admin'] },
              { id: 2, name: 'Bob', roles: ['user'] },
            ],
            settings: {
              theme: 'dark',
              notifications: {
                email: true,
                push: false,
              },
            },
          },
          actions: {},
          callbacks: [],
          localStorage: null,
          metadata: {},
          isContext: false,
        },
      };

      sendMessageFromMonkeyPath(message);

      expect(postMessageSpy).toHaveBeenCalledTimes(1);
      const sentMessage = postMessageSpy.mock.calls[0][0];
      expect(sentMessage.payload).toBeDefined();
      expect(typeof sentMessage.payload).toBe('string');
    });

    it('should handle state with special objects (Map, Set, Date)', () => {
      const message: MonkeyPathMessage = {
        id: 'msg-1',
        action: 'ADD_ACTION_LOG',
        payload: {
          logId: 'action-log:1',
          globalStateId: 'state-1',
          actionId: 'action:1',
          payload: {
            map: new Map([['key', 'value']]),
            set: new Set([1, 2, 3]),
            date: new Date('2026-04-18'),
          } as Any,
          case: 'resolved',
          scope: 'action',
          timestamp: Date.now(),
          subAction: null,
        },
      };

      sendMessageFromMonkeyPath(message);

      expect(postMessageSpy).toHaveBeenCalledTimes(1);

      expect(postMessageSpy).toHaveBeenCalled();
    });
  });

  describe('error scenarios', () => {
    it('propagates window.postMessage errors', () => {
      global.window = {
        postMessage: () => {
          throw new Error('postMessage failed');
        },
      } as Any;

      const message: MonkeyPathMessage = {
        id: 'msg-1',
        action: 'ADD_GLOBAL_STATE',
        payload: {
          globalStateId: 'state-1',
          name: 'Test',
          globalStatePath: '/test',
          initialState: {},
          actions: {},
          callbacks: [],
          localStorage: null,
          metadata: {},
          isContext: false,
        },
      };

      expect(() => sendMessageFromMonkeyPath(message)).toThrow('postMessage failed');
    });
  });
});
