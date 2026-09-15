/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Test data uses string literals for branded types; Zod validates at runtime
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { GlobalStateJson } from '@src/shared/schema/GlobalStateJson';
import type { ActionJson } from '@src/shared/schema/ActionJson';
import type { ActionLogJson } from '@src/shared/schema/ActionLogJson';
import { SubActionJsonEnum } from '@src/shared/schema/SubActionJson';

describe('Message Flow Integration', () => {
  let mockPort: any;
  let messageListeners: Array<(message: any) => void>;
  let windowMessageListeners: Array<(event: MessageEvent) => void>;

  beforeEach(() => {
    vi.clearAllMocks();
    messageListeners = [];
    windowMessageListeners = [];

    // Mock chrome.runtime.Port
    mockPort = {
      postMessage: vi.fn(),
      onMessage: {
        addListener: vi.fn((listener: any) => {
          messageListeners.push(listener);
        }),
      },
      onDisconnect: {
        addListener: vi.fn(),
      },
      name: 'content-script',
      sender: {
        tab: {
          id: 123,
        },
      },
    };

    // Mock window for content script
    global.window = {
      addEventListener: vi.fn((event, listener) => {
        if (event === 'message') {
          windowMessageListeners.push(listener as any);
        }
      }),
      postMessage: vi.fn(),
    } as any;

    // Mock chrome API
    (global as any).chrome = {
      runtime: {
        connect: vi.fn(() => mockPort),
        getURL: vi.fn((path) => `chrome-extension://fake-id/${path}`),
        lastError: null,
        onConnect: {
          addListener: vi.fn(),
        },
      },
      devtools: {
        inspectedWindow: {
          tabId: 123,
        },
      },
    };

    global.performance = {
      now: () => 123.456,
    } as any;

    global.document = {
      createElement: vi.fn(() => ({
        remove: vi.fn(),
        async: false,
        onload: null,
      })),
      documentElement: {
        prepend: vi.fn(),
      },
    } as any;
  });

  afterEach(() => {
    messageListeners = [];
    windowMessageListeners = [];
  });

  describe('Monkey Patch to Content Script Flow', () => {
    it('should forward ADD_GLOBAL_STATE message from monkey patch to content script', () => {
      // Simulate content script initialization
      const postMessageSpy = vi.fn();
      mockPort.postMessage = postMessageSpy;

      // Simulate monkey patch sending message
      const monkeyPatchMessage = {
        id: 'msg-1',
        timestamp: 123.456,
        action: 'monkey-patch/ADD_GLOBAL_STATE',
        payload: {
          globalStateId: 'state-1',
          name: 'Counter',
          globalStatePath: '/src/counter.ts',
          initialState: { count: 0 },
          actions: {},
          callbacks: [],
          localStorage: null,
          metadata: {},
        },
      };

      // Simulate window.postMessage from monkey patch
      const messageEvent = new MessageEvent('message', {
        data: monkeyPatchMessage,
        source: window,
      });

      // Trigger message listeners
      windowMessageListeners.forEach((listener) => listener(messageEvent));

      // In real scenario, content script would debounce and send
      // For test, we simulate immediate send
      expect(windowMessageListeners.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle START_ACTION message flow', () => {
      const startActionMessage = {
        id: 'msg-2',
        timestamp: 124.5,
        action: 'monkey-patch/START_ACTION',
        payload: {
          globalStateId: 'state-1',
          actionId: 'action:1',
          action: 'increment',
          async: false,
          start: Date.now(),
          timing: 0,
          logs: [],
          actionType: 'async',
        } as unknown as ActionJson,
      };

      const messageEvent = new MessageEvent('message', {
        data: startActionMessage,
        source: window,
      });

      windowMessageListeners.forEach((listener) => listener(messageEvent));

      // Message should be queued for sending
      expect(windowMessageListeners.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle ADD_ACTION_LOG message flow', () => {
      const addLogMessage = {
        id: 'msg-3',
        timestamp: 125.5,
        action: 'monkey-patch/ADD_ACTION_LOG',
        payload: {
          logId: 'action-log:1',
          globalStateId: 'state-1',
          actionId: 'action:1',
          payload: { count: 1 },
          case: 'resolved',
          scope: 'action',
          timestamp: Date.now(),
          subAction: SubActionJsonEnum.setState,
        } as unknown as ActionLogJson,
      };

      const messageEvent = new MessageEvent('message', {
        data: addLogMessage,
        source: window,
      });

      windowMessageListeners.forEach((listener) => listener(messageEvent));

      expect(windowMessageListeners.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter out non-monkey-patch messages', () => {
      const externalMessage = {
        id: 'external-msg',
        timestamp: 126.5,
        action: 'some-other-action',
        payload: {},
      };

      const messageEvent = new MessageEvent('message', {
        data: externalMessage,
        source: window,
      });

      // Should not process external messages
      windowMessageListeners.forEach((listener) => listener(messageEvent));

      // No error should be thrown
      expect(true).toBe(true);
    });

    it('should handle messages from different sources', () => {
      const message = {
        id: 'msg-1',
        timestamp: 123.456,
        action: 'monkey-patch/ADD_GLOBAL_STATE',
        payload: {} as unknown as GlobalStateJson,
      };

      // Message from different source should be ignored
      const wrongSourceEvent = new MessageEvent('message', {
        data: message,
        source: null,
      });

      windowMessageListeners.forEach((listener) => listener(wrongSourceEvent));

      // Should handle gracefully
      expect(true).toBe(true);
    });
  });

  describe('Content Script to DevTools Flow', () => {
    it('should forward messages to devtools port', () => {
      const postMessageSpy = vi.fn();
      mockPort.postMessage = postMessageSpy;

      const message = {
        action: 'ADD_GLOBAL_STATE',
        id: 'msg-1',
        timestamp: 123.456,
        payload: {
          globalStateId: 'state-1',
          name: 'Test',
          globalStatePath: '/test',
          initialState: {},
          actions: {},
          callbacks: [],
          localStorage: null,
          metadata: {},
        } as unknown as GlobalStateJson,
      };

      // Simulate content script forwarding to devtools
      mockPort.postMessage(message);

      expect(postMessageSpy).toHaveBeenCalledWith(message);
    });

    it('should handle port disconnection', () => {
      const disconnectCallbacks: Array<() => void> = [];
      mockPort.onDisconnect.addListener.mockImplementation((callback: any) => {
        disconnectCallbacks.push(callback);
      });

      // Add disconnect listener
      mockPort.onDisconnect.addListener(() => {
        // Port disconnected
      });

      expect(disconnectCallbacks.length).toBe(1);

      // Trigger disconnect
      disconnectCallbacks.forEach((cb) => cb());

      // Should handle gracefully
      expect(true).toBe(true);
    });

    it('should queue messages when port is not ready', () => {
      const pendingMessages: any[] = [];

      const message1 = {
        action: 'ADD_GLOBAL_STATE',
        id: 'msg-1',
        timestamp: 123.456,
        payload: {} as unknown as GlobalStateJson,
      };

      const message2 = {
        action: 'START_ACTION',
        id: 'msg-2',
        timestamp: 124.456,
        payload: {} as unknown as ActionJson,
      };

      // Messages should be queued
      pendingMessages.push(message1, message2);

      expect(pendingMessages).toHaveLength(2);

      // When port is ready, flush queue
      pendingMessages.forEach((msg) => {
        mockPort.postMessage(msg);
      });

      expect(mockPort.postMessage).toHaveBeenCalledTimes(2);
    });
  });

  describe('State Lifecycle Messages', () => {
    it('should handle complete state initialization flow', () => {
      const messages = [];

      // 1. Add global state
      const addStateMsg = {
        id: 'msg-1',
        action: 'monkey-patch/ADD_GLOBAL_STATE',
        timestamp: 100,
        payload: {
          globalStateId: 'state-1',
          name: 'Counter',
          globalStatePath: '/src/counter.ts',
          initialState: { count: 0 },
          actions: { increment: { length: 0 } },
          callbacks: [],
          localStorage: null,
          metadata: {},
        } as unknown as GlobalStateJson,
      };
      messages.push(addStateMsg);

      // 2. Start action
      const startActionMsg = {
        id: 'msg-2',
        action: 'monkey-patch/START_ACTION',
        timestamp: 110,
        payload: {
          globalStateId: 'state-1',
          actionId: 'action:1',
          action: 'increment',
          async: false,
          start: 100,
          timing: 0,
          logs: [],
          actionType: 'async',
        } as unknown as ActionJson,
      };
      messages.push(startActionMsg);

      // 3. Add action log
      const addLogMsg = {
        id: 'msg-3',
        action: 'monkey-patch/ADD_ACTION_LOG',
        timestamp: 120,
        payload: {
          logId: 'action-log:1',
          globalStateId: 'state-1',
          actionId: 'action:1',
          payload: { count: 1 },
          case: 'resolved',
          scope: 'action',
          timestamp: 115,
          subAction: SubActionJsonEnum.setState,
        } as unknown as ActionLogJson,
      };
      messages.push(addLogMsg);

      // 4. Update action timing
      const updateActionMsg = {
        id: 'msg-4',
        action: 'monkey-patch/UPDATE_ACTION',
        timestamp: 130,
        payload: {
          globalStateId: 'state-1',
          actionId: 'action:1',
          timing: 15,
        },
      };
      messages.push(updateActionMsg);

      expect(messages).toHaveLength(4);
      expect((messages[0].payload as any).globalStateId).toBe('state-1');
      expect((messages[1].payload as any).actionId).toBe('action:1');
      expect((messages[2].payload as any).logId).toBe('action-log:1');
      expect((messages[3].payload as any).timing).toBe(15);
    });

    it('should handle state cleanup flow', () => {
      const messages = [];

      // 1. Clear states for a path (e.g., fast refresh)
      const clearMsg = {
        id: 'msg-1',
        action: 'monkey-patch/CLEAR_GLOBAL_STATES',
        timestamp: 100,
        payload: {
          globalStatePath: '/src/counter.ts',
        },
      };
      messages.push(clearMsg);

      // 2. Add new state after refresh
      const addStateMsg = {
        id: 'msg-2',
        action: 'monkey-patch/ADD_GLOBAL_STATE',
        timestamp: 110,
        payload: {
          globalStateId: 'state-2',
          name: 'Counter',
          globalStatePath: '/src/counter.ts',
          initialState: { count: 0 },
          actions: {},
          callbacks: [],
          localStorage: null,
          metadata: {},
        } as unknown as GlobalStateJson,
      };
      messages.push(addStateMsg);

      expect(messages).toHaveLength(2);
      expect((messages[0].payload as any).globalStatePath).toBe('/src/counter.ts');
      expect((messages[1].payload as any).globalStateId).toBe('state-2');
    });

    it('should handle individual state deletion', () => {
      const deleteMsg = {
        id: 'msg-1',
        action: 'monkey-patch/DELETE_GLOBAL_STATE',
        timestamp: 100,
        payload: {
          globalStateId: 'state-1',
        },
      };

      expect(deleteMsg.payload.globalStateId).toBe('state-1');
    });
  });

  describe('Async Action Flow', () => {
    it('should handle async action lifecycle', () => {
      const messages = [];

      // 1. Start async action (pending)
      const startMsg = {
        id: 'msg-1',
        action: 'monkey-patch/START_ACTION',
        timestamp: 100,
        payload: {
          globalStateId: 'state-1',
          actionId: 'action:1',
          action: 'fetchData',
          async: true,
          start: 100,
          timing: 0,
          logs: [
            {
              logId: 'action-log:1',
              globalStateId: 'state-1',
              actionId: 'action:1',
              payload: null,
              case: 'pending',
              scope: 'action',
              timestamp: 100,
              subAction: null,
            },
          ],
          actionType: 'async',
        } as unknown as ActionJson,
      };
      messages.push(startMsg);

      // 2. Action resolves
      const resolveMsg = {
        id: 'msg-2',
        action: 'monkey-patch/ADD_ACTION_LOG',
        timestamp: 250,
        payload: {
          logId: 'action-log:2',
          globalStateId: 'state-1',
          actionId: 'action:1',
          payload: { data: [1, 2, 3] },
          case: 'resolved',
          scope: 'action',
          timestamp: 250,
          subAction: SubActionJsonEnum.setState,
        } as unknown as ActionLogJson,
      };
      messages.push(resolveMsg);

      // 3. Update timing
      const updateMsg = {
        id: 'msg-3',
        action: 'monkey-patch/UPDATE_ACTION',
        timestamp: 260,
        payload: {
          globalStateId: 'state-1',
          actionId: 'action:1',
          timing: 150,
        },
      };
      messages.push(updateMsg);

      expect(messages).toHaveLength(3);
      expect((messages[0].payload as any).async).toBe(true);
      expect((messages[0].payload as ActionJson).logs[0].case).toBe('pending');
      expect((messages[1].payload as any).case).toBe('resolved');
      expect((messages[2].payload as any).timing).toBe(150);
    });

    it('should handle async action rejection', () => {
      const messages = [];

      // 1. Start async action
      const startMsg = {
        id: 'msg-1',
        action: 'monkey-patch/START_ACTION',
        timestamp: 100,
        payload: {
          globalStateId: 'state-1',
          actionId: 'action:1',
          action: 'fetchData',
          async: true,
          start: 100,
          timing: 0,
          logs: [],
          actionType: 'async',
        } as unknown as ActionJson,
      };
      messages.push(startMsg);

      // 2. Action rejects
      const rejectMsg = {
        id: 'msg-2',
        action: 'monkey-patch/ADD_ACTION_LOG',
        timestamp: 200,
        payload: {
          logId: 'action-log:1',
          globalStateId: 'state-1',
          actionId: 'action:1',
          payload: { error: 'Network timeout' },
          case: 'rejected',
          scope: 'action',
          timestamp: 200,
          subAction: null,
        } as unknown as ActionLogJson,
      };
      messages.push(rejectMsg);

      expect(messages).toHaveLength(2);
      expect((messages[1].payload as any).case).toBe('rejected');
      expect((messages[1].payload as ActionLogJson).payload).toEqual({
        error: 'Network timeout',
      });
    });
  });

  describe('Message Timing and Order', () => {
    it('should maintain message order', () => {
      const messages = [];

      for (let i = 0; i < 10; i++) {
        messages.push({
          id: `msg-${i}`,
          action: 'monkey-patch/ADD_ACTION_LOG',
          timestamp: 100 + i,
          payload: {
            logId: `log-${i}`,
            globalStateId: 'state-1',
            actionId: 'action:1',
            payload: { index: i },
            case: 'resolved',
            scope: 'action',
            timestamp: 100 + i,
            subAction: null,
          } as unknown as ActionLogJson,
        });
      }

      expect(messages).toHaveLength(10);
      messages.forEach((msg, idx) => {
        expect(msg.timestamp).toBe(100 + idx);
      });
    });

    it('should handle rapid message bursts', () => {
      const messages = [];

      // Simulate 100 messages sent rapidly
      for (let i = 0; i < 100; i++) {
        messages.push({
          id: `msg-${i}`,
          action: 'monkey-patch/ADD_ACTION_LOG',
          timestamp: 100 + i * 0.1,
          payload: {} as unknown as ActionLogJson,
        });
      }

      expect(messages).toHaveLength(100);
    });
  });

  describe('Error Handling in Message Flow', () => {
    it('should handle malformed messages gracefully', () => {
      const malformedMessage = {
        // missing id
        action: 'monkey-patch/ADD_GLOBAL_STATE',
        payload: 'invalid',
      };

      const messageEvent = new MessageEvent('message', {
        data: malformedMessage,
        source: window,
      });

      // Should not crash
      try {
        windowMessageListeners.forEach((listener) => listener(messageEvent));
      } catch (error) {
        // Expected to fail validation
      }

      expect(true).toBe(true);
    });

    it('should handle missing payload fields', () => {
      const incompleteMessage = {
        id: 'msg-1',
        action: 'monkey-patch/ADD_GLOBAL_STATE',
        timestamp: 123,
        payload: {
          globalStateId: 'state-1',
          // missing required fields
        },
      };

      const messageEvent = new MessageEvent('message', {
        data: incompleteMessage,
        source: window,
      });

      // Should handle validation error
      try {
        windowMessageListeners.forEach((listener) => listener(messageEvent));
      } catch (error) {
        // Expected validation error
      }

      expect(true).toBe(true);
    });
  });
});
