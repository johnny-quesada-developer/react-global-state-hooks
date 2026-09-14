import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { Logger } from '../src/monkey_patch.logger';
import { ActionTypeJsonEnum } from '../src/schema/ActionTypeJson';
import { SubActionJsonEnum } from '../src/schema/SubActionJson';

// Mock only external boundary - window.postMessage
let mockPostMessage: ReturnType<typeof vi.fn>;
let postedMessages: any[] = [];

describe('monkey_patch.logger - Message Contract Tests', () => {
  let logger: Logger;

  beforeEach(() => {
    postedMessages = [];
    mockPostMessage = vi.fn((message) => {
      postedMessages.push(message);
    });

    // Mock browser APIs (external boundary)
    global.window = {
      postMessage: mockPostMessage,
    } as any;

    global.performance = {
      now: () => 123.456,
    } as any;

    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
    logger = new Logger({ storeId: 'test-store-123', prefix: 'test-prefix' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Logger constructor', () => {
    it('should create logger with storeId and default prefix', () => {
      const loggerWithoutPrefix = new Logger({ storeId: 'store-1' });
      expect(loggerWithoutPrefix.storeId).toBe('store-1');
      expect(loggerWithoutPrefix.prefix).toBe('');
    });

    it('should create logger with custom prefix', () => {
      const loggerWithPrefix = new Logger({ storeId: 'store-1', prefix: 'custom' });
      expect(loggerWithPrefix.storeId).toBe('store-1');
      expect(loggerWithPrefix.prefix).toBe('custom');
    });
  });

  describe('addEntryForInitialAction - START_ACTION message contract', () => {
    it('should send START_ACTION message with correct structure for setState', () => {
      const firstLog = {
        actionId: 'action-1',
        payload: { count: 1 },
        case: 'resolved' as const,
        subAction: SubActionJsonEnum.setState,
      };

      logger.addEntryForInitialAction({
        action: 'increment',
        firstLog,
        actionType: ActionTypeJsonEnum.STATE_ACTION,
      });

      // Verify real message was sent via window.postMessage
      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      const message = postedMessages[0];

      // Payload is serialized by formatToStore in sendMessageFromMonkeyPath
      const payload = typeof message.payload === 'string' ? JSON.parse(message.payload) : message.payload;

      // Verify message structure (tests real sendMessageFromMonkeyPath behavior)
      expect(message.action).toBe('monkey-patch/START_ACTION');
      expect(message.timestamp).toBe(123.456);
      expect(message.id).toMatch(/^logger:/);

      // Verify payload content
      expect(payload).toMatchObject({
        actionId: 'action-1',
        globalStateId: 'test-store-123',
        action: 'increment',
        async: false,
        start: expect.any(Number),
        timing: 0,
        actionType: ActionTypeJsonEnum.STATE_ACTION,
        logs: [
          {
            actionId: 'action-1',
            payload: { count: 1 },
            case: 'resolved',
            subAction: SubActionJsonEnum.setState,
            logId: expect.any(String),
            scope: 'test-prefix',
            timestamp: expect.any(Number),
            globalStateId: 'test-store-123',
          },
        ],
      });
    });

    it('should send START_ACTION for async actions', () => {
      const firstLog = {
        actionId: 'async-action-1',
        payload: undefined,
        case: 'pending' as const,
        subAction: null,
      };

      logger.addEntryForInitialAction({
        action: 'fetchData',
        firstLog,
        actionType: ActionTypeJsonEnum.CUSTOM_ACTION, // Using CUSTOM_ACTION for async-like actions
      });

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      const message = postedMessages[0];
      const payload = typeof message.payload === 'string' ? JSON.parse(message.payload) : message.payload;

      expect(message.action).toBe('monkey-patch/START_ACTION');
      expect(payload.actionType).toBe(ActionTypeJsonEnum.CUSTOM_ACTION);
      expect(payload.logs[0].case).toBe('pending');
      // formatToStore serializes undefined payload as { "$t": "undefined" }
      expect(payload.logs[0].payload).toEqual({ $t: 'undefined' });
    });

    it('should include correct timestamps in START_ACTION', () => {
      const fixedTime = new Date('2024-01-01T12:00:00.000Z').getTime();
      vi.setSystemTime(fixedTime);

      const firstLog = {
        actionId: 'action-1',
        payload: { data: 'test' },
        case: 'resolved' as const,
        subAction: SubActionJsonEnum.setState,
      };

      logger.addEntryForInitialAction({
        action: 'update',
        firstLog,
        actionType: ActionTypeJsonEnum.STATE_ACTION,
      });

      const message = postedMessages[0];
      const payload = typeof message.payload === 'string' ? JSON.parse(message.payload) : message.payload;

      expect(payload.start).toBe(fixedTime);
      expect(payload.logs[0].timestamp).toBe(fixedTime);
    });

    it('should return ActionJson for further logging', () => {
      const firstLog = {
        actionId: 'action-1',
        payload: { value: 42 },
        case: 'resolved' as const,
        subAction: SubActionJsonEnum.setState,
      };

      const result = logger.addEntryForInitialAction({
        action: 'setValue',
        firstLog,
        actionType: ActionTypeJsonEnum.STATE_ACTION,
      });

      expect(result).toMatchObject({
        actionId: 'action-1',
        globalStateId: 'test-store-123',
        action: 'setValue',
        async: false,
        start: expect.any(Number),
        timing: 0,
        actionType: ActionTypeJsonEnum.STATE_ACTION,
        logs: expect.any(Array),
      });
    });
  });

  describe('pushActionLogUpdate - UPDATE_ACTION message contract', () => {
    it('should send UPDATE_ACTION message with timing', () => {
      const actionJson = {
        actionId: 'action-1',
        globalStateId: 'test-store-123',
        action: 'increment',
        async: false,
        start: 1000,
        timing: 150,
        actionType: ActionTypeJsonEnum.STATE_ACTION,
        logs: [],
      };

      logger.pushActionLogUpdate(actionJson);

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      const message = postedMessages[0];
      const payload = typeof message.payload === 'string' ? JSON.parse(message.payload) : message.payload;

      expect(message.action).toBe('monkey-patch/UPDATE_ACTION');
      expect(message.timestamp).toBe(123.456);
      expect(message.id).toMatch(/^logger:/);
      expect(payload).toEqual(actionJson);
    });

    it('should preserve all action metadata in UPDATE_ACTION', () => {
      const actionJson = {
        actionId: 'action-2',
        globalStateId: 'store-456',
        action: 'complexAction',
        async: true,
        start: 5000,
        timing: 250,
        actionType: ActionTypeJsonEnum.CUSTOM_ACTION,
        logs: [
          {
            logId: 'log-1',
            actionId: 'action-2',
            globalStateId: 'store-456',
            payload: { step: 1 },
            case: 'pending' as const,
            scope: 'test',
            timestamp: 5000,
            subAction: null,
          },
        ],
      };

      logger.pushActionLogUpdate(actionJson);

      const message = postedMessages[0];
      const payload = typeof message.payload === 'string' ? JSON.parse(message.payload) : message.payload;
      // Verify key properties are preserved (formatToStore handles serialization)
      expect(payload.actionId).toBe(actionJson.actionId);
      expect(payload.globalStateId).toBe(actionJson.globalStateId);
      expect(payload.action).toBe(actionJson.action);
      expect(payload.timing).toBe(actionJson.timing);
      expect(payload.logs[0].payload).toEqual({ step: 1 });
    });
  });

  describe('pushActionEntry - ADD_ACTION_LOG message contract', () => {
    it('should send ADD_ACTION_LOG message with correct log structure', () => {
      const actionMeta = {
        actionId: 'action-1',
        globalStateId: 'test-store-123',
        action: 'increment',
        async: false,
        start: 1000,
        timing: 0,
        actionType: ActionTypeJsonEnum.STATE_ACTION,
        logs: [],
      };

      const log = {
        actionId: 'action-1',
        payload: { count: 2 },
        case: 'resolved' as const,
        subAction: SubActionJsonEnum.setState,
      };

      vi.setSystemTime(1150);

      logger.pushActionEntry({
        actionMeta,
        log,
        isFinalEntry: false,
      });

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      const message = postedMessages[0];
      const payload = typeof message.payload === 'string' ? JSON.parse(message.payload) : message.payload;

      expect(message.action).toBe('monkey-patch/ADD_ACTION_LOG');
      expect(payload).toMatchObject({
        actionId: 'action-1',
        payload: { count: 2 },
        case: 'resolved',
        subAction: SubActionJsonEnum.setState,
        logId: expect.any(String),
        scope: 'test-prefix',
        timestamp: 1150,
        globalStateId: 'test-store-123',
      });
    });

    it('should send both ADD_ACTION_LOG and UPDATE_ACTION when isFinalEntry is true', () => {
      const actionMeta = {
        actionId: 'action-1',
        globalStateId: 'test-store-123',
        action: 'fetchData',
        async: true,
        start: 1000,
        timing: 0,
        actionType: ActionTypeJsonEnum.CUSTOM_ACTION,
        logs: [],
      };

      const log = {
        actionId: 'action-1',
        payload: { result: 'success' },
        case: 'resolved' as const,
        subAction: null,
      };

      vi.setSystemTime(1250);

      logger.pushActionEntry({
        actionMeta,
        log,
        isFinalEntry: true,
      });

      expect(mockPostMessage).toHaveBeenCalledTimes(2);

      // First call: ADD_ACTION_LOG
      const firstMessage = postedMessages[0];
      const firstPayload =
        typeof firstMessage.payload === 'string' ? JSON.parse(firstMessage.payload) : firstMessage.payload;

      expect(firstMessage.action).toBe('monkey-patch/ADD_ACTION_LOG');
      expect(firstPayload).toMatchObject({
        actionId: 'action-1',
        payload: { result: 'success' },
        case: 'resolved',
      });

      // Second call: UPDATE_ACTION with timing
      const secondMessage = postedMessages[1];
      const secondPayload =
        typeof secondMessage.payload === 'string' ? JSON.parse(secondMessage.payload) : secondMessage.payload;

      expect(secondMessage.action).toBe('monkey-patch/UPDATE_ACTION');
      expect(secondPayload).toMatchObject({
        actionId: 'action-1',
        globalStateId: 'test-store-123',
        timing: 250, // 1250 - 1000
      });
    });

    it('should not send UPDATE_ACTION when isFinalEntry is false', () => {
      const actionMeta = {
        actionId: 'action-1',
        globalStateId: 'test-store-123',
        action: 'update',
        async: false,
        start: 1000,
        timing: 0,
        actionType: ActionTypeJsonEnum.STATE_ACTION,
        logs: [],
      };

      const log = {
        actionId: 'action-1',
        payload: { intermediate: true },
        case: 'pending' as const,
        subAction: null,
      };

      logger.pushActionEntry({
        actionMeta,
        log,
        isFinalEntry: false,
      });

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      expect(postedMessages[0].action).toBe('monkey-patch/ADD_ACTION_LOG');
    });

    it('should include logId in ADD_ACTION_LOG payload', () => {
      const actionMeta = {
        actionId: 'action-1',
        globalStateId: 'test-store-123',
        action: 'test',
        async: false,
        start: 1000,
        timing: 0,
        actionType: ActionTypeJsonEnum.STATE_ACTION,
        logs: [],
      };

      const log = {
        actionId: 'action-1',
        payload: {},
        case: 'resolved' as const,
        subAction: SubActionJsonEnum.setState,
      };

      logger.pushActionEntry({
        actionMeta,
        log,
        isFinalEntry: false,
      });

      const message = postedMessages[0];
      const payload = typeof message.payload === 'string' ? JSON.parse(message.payload) : message.payload;
      expect(payload.logId).toMatch(/^action-log:/);
    });
  });

  describe('recordStateMutation - complete setState flow', () => {
    it('should send START_ACTION for setState with correct payload', () => {
      const state = { count: 42, name: 'test' };

      logger.recordStateMutation({
        actionId: 'action-1',
        state,
      });

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      const message = postedMessages[0];
      const payload = typeof message.payload === 'string' ? JSON.parse(message.payload) : message.payload;

      expect(message.action).toBe('monkey-patch/START_ACTION');
      expect(payload).toMatchObject({
        action: 'setState',
        actionType: ActionTypeJsonEnum.STATE_ACTION,
        async: false,
        logs: [
          {
            payload: state,
            case: 'resolved',
            subAction: SubActionJsonEnum.setState,
          },
        ],
      });
    });

    it('should include setStateConfig when provided', () => {
      const state = { value: 100 };
      const config = {
        replace: true,
        notMerge: true,
      };

      logger.recordStateMutation({
        actionId: 'action-2',
        state,
        config,
      });

      const message = postedMessages[0];
      const payload = typeof message.payload === 'string' ? JSON.parse(message.payload) : message.payload;
      expect(payload.logs[0]).toMatchObject({
        payload: state,
        setStateConfig: config,
      });
    });

    it('should handle null/undefined state', () => {
      logger.recordStateMutation({
        actionId: 'action-3',
        state: null,
      });

      const message = postedMessages[0];
      const payload = typeof message.payload === 'string' ? JSON.parse(message.payload) : message.payload;
      expect(payload.logs[0].payload).toBeNull();
    });

    it('should handle complex state objects', () => {
      const complexState = {
        user: { id: 1, name: 'John' },
        items: [1, 2, 3],
        metadata: { timestamp: Date.now() },
      };

      logger.recordStateMutation({
        actionId: 'action-4',
        state: complexState,
      });

      const message = postedMessages[0];
      const payload = typeof message.payload === 'string' ? JSON.parse(message.payload) : message.payload;
      expect(payload.logs[0].payload).toEqual(complexState);
    });
  });

  describe('Message contract - async action lifecycle', () => {
    it('should track complete async action flow: START -> ADD_LOG -> UPDATE', () => {
      const startTime = 1000;
      const middleTime = 1100;
      const endTime = 1250;

      // Step 1: Start async action (pending)
      vi.setSystemTime(startTime);
      const actionMeta = logger.addEntryForInitialAction({
        action: 'fetchUser',
        firstLog: {
          actionId: 'async-1',
          payload: undefined,
          case: 'pending',
          subAction: null,
        },
        actionType: ActionTypeJsonEnum.CUSTOM_ACTION,
      });

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      expect(postedMessages[0].action).toBe('monkey-patch/START_ACTION');

      // Step 2: Add intermediate log
      vi.setSystemTime(middleTime);
      logger.pushActionEntry({
        actionMeta,
        log: {
          actionId: 'async-1',
          payload: { status: 'loading' },
          case: 'pending',
          subAction: SubActionJsonEnum.setState,
        },
        isFinalEntry: false,
      });

      expect(mockPostMessage).toHaveBeenCalledTimes(2);
      expect(postedMessages[1].action).toBe('monkey-patch/ADD_ACTION_LOG');

      // Step 3: Final resolved log
      vi.setSystemTime(endTime);
      logger.pushActionEntry({
        actionMeta,
        log: {
          actionId: 'async-1',
          payload: { user: { id: 1, name: 'John' } },
          case: 'resolved',
          subAction: null,
        },
        isFinalEntry: true,
      });

      expect(mockPostMessage).toHaveBeenCalledTimes(4);
      expect(postedMessages[2].action).toBe('monkey-patch/ADD_ACTION_LOG');
      expect(postedMessages[3].action).toBe('monkey-patch/UPDATE_ACTION');

      const updatePayload =
        typeof postedMessages[3].payload === 'string'
          ? JSON.parse(postedMessages[3].payload)
          : postedMessages[3].payload;
      expect(updatePayload.timing).toBe(250);
    });
  });

  describe('Message IDs uniqueness', () => {
    it('should generate unique IDs for each message', () => {
      logger.recordStateMutation({ actionId: 'a1', state: { v: 1 } });
      logger.recordStateMutation({ actionId: 'a2', state: { v: 2 } });
      logger.recordStateMutation({ actionId: 'a3', state: { v: 3 } });

      const ids = postedMessages.map((msg) => msg.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(3);
      expect(ids.every((id) => id.startsWith('logger:'))).toBe(true);
    });
  });

  describe('Edge cases in message contract', () => {
    it('should handle empty payload in logs', () => {
      logger.recordStateMutation({
        actionId: 'action-empty',
        state: undefined,
      });

      const message = postedMessages[0];
      const payload = typeof message.payload === 'string' ? JSON.parse(message.payload) : message.payload;
      // formatToStore serializes undefined as { $t: 'undefined' }
      expect(payload.logs[0].payload).toEqual({ $t: 'undefined' });
    });

    it('should handle very long action names', () => {
      const longActionName = 'a'.repeat(1000);

      logger.addEntryForInitialAction({
        action: longActionName,
        firstLog: {
          actionId: 'action-1',
          payload: {},
          case: 'resolved',
          subAction: SubActionJsonEnum.setState,
        },
        actionType: ActionTypeJsonEnum.STATE_ACTION,
      });

      const message = postedMessages[0];
      const payload = typeof message.payload === 'string' ? JSON.parse(message.payload) : message.payload;
      expect(payload.action).toBe(longActionName);
    });

    it('should preserve prefix in all log entries', () => {
      const prefixedLogger = new Logger({ storeId: 'store-1', prefix: 'my-custom-prefix' });

      prefixedLogger.recordStateMutation({
        actionId: 'action-1',
        state: { test: true },
      });

      const message = postedMessages[0];
      const payload = typeof message.payload === 'string' ? JSON.parse(message.payload) : message.payload;
      expect(payload.logs[0].scope).toBe('my-custom-prefix');
    });
  });
});
