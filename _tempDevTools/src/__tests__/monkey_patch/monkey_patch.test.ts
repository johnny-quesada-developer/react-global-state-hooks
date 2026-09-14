import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import {
  makeSetStateWrapper,
  makeGetStoreActionsMapWrapper,
  makeGetLifeCycleStoreToolsWrapper,
  sendDeleteGlobalStateMessage,
} from '../../monkey_patch/monkey_patch';
import type { SetStateConfigJson } from '../../monkey_patch/schema/SetStateConfigJson';
import type { GlobalStoreParameter } from '../../monkey_patch/tools/react';
import type { DevtoolsWireMessage } from './contracts';

// Mock only external boundaries - window.postMessage and performance.now
let mockPostMessage: ReturnType<typeof vi.fn>;
let postedMessages: DevtoolsWireMessage[] = [];

// Simplified uniqueId for deterministic tests
vi.mock('react-global-state-hooks/uniqueId', () => {
  let counter = 0;
  const mockUniqueId = (prefix: string) => `${prefix}${counter++}`;
  mockUniqueId.for = (prefix: string) => {
    let localCounter = 0;
    return () => `${prefix}${localCounter++}`;
  };
  return {
    default: mockUniqueId,
  };
});

describe('monkey_patch.ts - Core Functions', () => {
  beforeEach(() => {
    postedMessages = [];
    mockPostMessage = vi.fn((message) => {
      postedMessages.push(message);
    });

    // Mock browser APIs (external boundary)
    global.window = {
      postMessage: mockPostMessage,
    } as unknown as Window;

    global.performance = {
      now: () => 123.456,
    } as unknown as Performance;

    vi.clearAllMocks();
  });

  describe('makeSetStateWrapper', () => {
    it('should wrap setState and call log callback before setState', () => {
      const mockState = { count: 0 };
      const mockSetState = vi.fn();
      const mockLogCallback = vi.fn();

      const mockStore: Partial<GlobalStoreParameter> = {
        state: mockState,
      };

      const wrappedSetState = makeSetStateWrapper(
        {
          store: mockStore as GlobalStoreParameter,
          setState: mockSetState,
        },
        mockLogCallback
      );

      // Call wrapped setState with new state
      wrappedSetState({ count: 1 });

      // Log callback should be called first
      expect(mockLogCallback).toHaveBeenCalledTimes(1);
      expect(mockLogCallback).toHaveBeenCalledWith({
        state: { count: 1 },
        config: {},
      });

      // Then setState should be called
      expect(mockSetState).toHaveBeenCalledTimes(1);
      expect(mockSetState).toHaveBeenCalledWith({ count: 1 }, {});
    });

    it('should handle function setter', () => {
      const mockState = { count: 5 };
      const mockSetState = vi.fn();
      const mockLogCallback = vi.fn();

      const mockStore: Partial<GlobalStoreParameter> = {
        state: mockState,
      };

      const wrappedSetState = makeSetStateWrapper(
        {
          store: mockStore as GlobalStoreParameter,
          setState: mockSetState,
        },
        mockLogCallback
      );

      // Use function setter
      const setterFunction = (prev: { count: number }) => ({ count: prev.count + 1 });
      wrappedSetState(setterFunction);

      // Should call with computed value
      expect(mockLogCallback).toHaveBeenCalledWith({
        state: { count: 6 },
        config: {},
      });

      expect(mockSetState).toHaveBeenCalledWith({ count: 6 }, {});
    });

    it('should pass config parameter through', () => {
      const mockState = { count: 0 };
      const mockSetState = vi.fn();
      const mockLogCallback = vi.fn();

      const mockStore: Partial<GlobalStoreParameter> = {
        state: mockState,
      };

      const wrappedSetState = makeSetStateWrapper(
        {
          store: mockStore as GlobalStoreParameter,
          setState: mockSetState,
        },
        mockLogCallback
      );

      const config = { skipStorage: true };
      wrappedSetState({ count: 10 }, config as SetStateConfigJson);

      expect(mockLogCallback).toHaveBeenCalledWith({
        state: { count: 10 },
        config,
      });

      expect(mockSetState).toHaveBeenCalledWith({ count: 10 }, config);
    });

    it('should handle undefined and null states', () => {
      const mockState = { data: 'test' };
      const mockSetState = vi.fn();
      const mockLogCallback = vi.fn();

      const mockStore: Partial<GlobalStoreParameter> = {
        state: mockState,
      };

      const wrappedSetState = makeSetStateWrapper(
        {
          store: mockStore as GlobalStoreParameter,
          setState: mockSetState,
        },
        mockLogCallback
      );

      wrappedSetState(null);
      expect(mockLogCallback).toHaveBeenCalledWith({
        state: null,
        config: {},
      });

      wrappedSetState(undefined);
      expect(mockLogCallback).toHaveBeenCalledWith({
        state: undefined,
        config: {},
      });
    });

    it('should preserve this context when calling setState', () => {
      const mockState = { count: 0 };
      let capturedContext: unknown = null;

      const mockSetState = vi.fn(function (this: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        capturedContext = this;
      });

      const mockStore: Partial<GlobalStoreParameter> = {
        state: mockState,
      };

      const wrappedSetState = makeSetStateWrapper(
        {
          store: mockStore as GlobalStoreParameter,
          setState: mockSetState,
        },
        vi.fn()
      );

      wrappedSetState({ count: 1 });

      // Context should be preserved
      expect(capturedContext).toBe(mockStore);
    });

    it('should handle complex nested state objects', () => {
      const mockState = {
        user: { name: 'John', age: 30 },
        settings: { theme: 'dark', notifications: true },
      };

      const mockSetState = vi.fn();
      const mockLogCallback = vi.fn();

      const mockStore: Partial<GlobalStoreParameter> = {
        state: mockState,
      };

      const wrappedSetState = makeSetStateWrapper(
        {
          store: mockStore as GlobalStoreParameter,
          setState: mockSetState,
        },
        mockLogCallback
      );

      const newState = {
        user: { name: 'Jane', age: 25 },
        settings: { theme: 'light', notifications: false },
      };

      wrappedSetState(newState);

      expect(mockLogCallback).toHaveBeenCalledWith({
        state: newState,
        config: {},
      });
    });
  });

  describe('makeGetStoreActionsMapWrapper', () => {
    it('should return original storeTools when actions is null', () => {
      const mockStoreTools = { state: { count: 0 }, setState: vi.fn() };
      const mockStore: Partial<GlobalStoreParameter> = {
        _DEV_TOOLS_STORE_ID: 'store-1',
      };

      const wrapper = makeGetStoreActionsMapWrapper({
        logsPrefix: 'test',
        store: mockStore as GlobalStoreParameter,
        setState: vi.fn(),
        getStoreActionsMap: () => ({
          actions: null,
          storeTools: mockStoreTools as unknown as GlobalStoreParameter['storeTools'],
        }),
      });

      const result = wrapper();

      expect(result.actions).toBeNull();
      expect(result.storeTools).toBe(mockStoreTools);
    });

    it('should return wrapped actions when actions exist', () => {
      const mockAction = vi.fn(() => 'success');

      const mockActions = {
        increment: mockAction,
      };

      const mockStore: Partial<GlobalStoreParameter> = {
        _DEV_TOOLS_STORE_ID: 'store-1',
        state: { count: 0 },
      };

      const mockSetState = vi.fn();
      const mockStoreTools = {
        state: { count: 0 },
        setState: mockSetState,
      };

      const wrapper = makeGetStoreActionsMapWrapper({
        logsPrefix: 'test',
        store: mockStore as GlobalStoreParameter,
        setState: mockSetState,
        getStoreActionsMap: () => ({
          actions: mockActions as unknown as NonNullable<GlobalStoreParameter['actions']>,
          storeTools: mockStoreTools as unknown as GlobalStoreParameter['storeTools'],
        }),
      });

      const result = wrapper();

      // Actions should be present
      expect(result.actions).toBeDefined();
      expect(result.actions!.increment).toBeDefined();
      expect(typeof result.actions!.increment).toBe('function');
    });

    it('should wrap multiple actions', () => {
      const mockActions = {
        increment: vi.fn(() => 'increment result'),
        decrement: vi.fn(() => 'decrement result'),
        reset: vi.fn(() => 'reset result'),
      };

      const mockStore: Partial<GlobalStoreParameter> = {
        _DEV_TOOLS_STORE_ID: 'store-1',
        state: { count: 0 },
      };

      const mockSetState = vi.fn();
      const mockStoreTools = {
        state: { count: 0 },
        setState: mockSetState,
      };

      const wrapper = makeGetStoreActionsMapWrapper({
        logsPrefix: 'test',
        store: mockStore as GlobalStoreParameter,
        setState: mockSetState,
        getStoreActionsMap: () => ({
          actions: mockActions as unknown as NonNullable<GlobalStoreParameter['actions']>,
          storeTools: mockStoreTools as unknown as GlobalStoreParameter['storeTools'],
        }),
      });

      const result = wrapper();

      // All actions should be present
      expect(result.actions!.increment).toBeDefined();
      expect(result.actions!.decrement).toBeDefined();
      expect(result.actions!.reset).toBeDefined();
    });

    it('should handle actions with different prefixes', () => {
      const mockActions = {
        action1: vi.fn(() => 'result'),
      };

      const mockStore: Partial<GlobalStoreParameter> = {
        _DEV_TOOLS_STORE_ID: 'store-1',
        state: {},
      };

      const mockSetState = vi.fn();
      const mockStoreTools = {
        state: {},
        setState: mockSetState,
      };

      // Test with different prefixes
      const prefixes = ['', 'lifecycle:', 'onStateChanged:', 'test:'];

      prefixes.forEach((prefix) => {
        const wrapper = makeGetStoreActionsMapWrapper({
          logsPrefix: prefix,
          store: mockStore as GlobalStoreParameter,
          setState: mockSetState,
          getStoreActionsMap: () => ({
            actions: mockActions as unknown as NonNullable<GlobalStoreParameter['actions']>,
            storeTools: mockStoreTools as unknown as GlobalStoreParameter['storeTools'],
          }),
        });

        const result = wrapper();
        expect(result.actions).toBeDefined();
      });
    });
  });

  describe('makeGetLifeCycleStoreToolsWrapper', () => {
    it('should return a function that creates wrapped store tools', () => {
      const mockActions = {
        increment: vi.fn(),
      };

      const mockStore: Partial<GlobalStoreParameter> = {
        _DEV_TOOLS_STORE_ID: 'store-1',
        state: { count: 0 },
      };

      const mockSetState = vi.fn();
      const mockStoreTools = {
        state: { count: 0 },
        setState: mockSetState,
      };

      const wrapper = makeGetLifeCycleStoreToolsWrapper({
        store: mockStore as GlobalStoreParameter,
        setState: mockSetState,
        getStoreActionsMap: () => ({
          actions: mockActions as unknown as NonNullable<GlobalStoreParameter['actions']>,
          storeTools: mockStoreTools as unknown as GlobalStoreParameter['storeTools'],
        }),
      });

      // Should return a function
      expect(typeof wrapper).toBe('function');

      // Call the returned function with a prefix
      const tools = wrapper('onInit');

      // Should return storeTools
      expect(tools).toBeDefined();
      expect(tools.state).toBeDefined();
      expect(tools.setState).toBeDefined();
    });

    it('should pass logsPrefix to underlying wrapper', () => {
      const mockActions = {
        setup: vi.fn(() => 'setup result'),
      };

      const mockStore: Partial<GlobalStoreParameter> = {
        _DEV_TOOLS_STORE_ID: 'store-1',
        state: {},
      };

      const mockSetState = vi.fn();
      const mockStoreTools = {
        state: {},
        setState: mockSetState,
      };

      const wrapper = makeGetLifeCycleStoreToolsWrapper({
        store: mockStore as GlobalStoreParameter,
        setState: mockSetState,
        getStoreActionsMap: () => ({
          actions: mockActions as unknown as NonNullable<GlobalStoreParameter['actions']>,
          storeTools: mockStoreTools as unknown as GlobalStoreParameter['storeTools'],
        }),
      });

      const tools = wrapper('lifecycle:onMount');

      // Tools should be wrapped with the prefix
      expect(tools).toBeDefined();
    });

    it('should work with different lifecycle prefixes', () => {
      const mockActions = {
        action1: vi.fn(),
      };

      const mockStore: Partial<GlobalStoreParameter> = {
        _DEV_TOOLS_STORE_ID: 'store-1',
        state: {},
      };

      const mockSetState = vi.fn();
      const mockStoreTools = {
        state: {},
        setState: mockSetState,
      };

      const wrapper = makeGetLifeCycleStoreToolsWrapper({
        store: mockStore as GlobalStoreParameter,
        setState: mockSetState,
        getStoreActionsMap: () => ({
          actions: mockActions as unknown as NonNullable<GlobalStoreParameter['actions']>,
          storeTools: mockStoreTools as unknown as GlobalStoreParameter['storeTools'],
        }),
      });

      // Test different lifecycle hooks
      const onInitTools = wrapper('onInit');
      const onMountTools = wrapper('onMount');
      const onUnmountTools = wrapper('onUnmount');

      expect(onInitTools).toBeDefined();
      expect(onMountTools).toBeDefined();
      expect(onUnmountTools).toBeDefined();
    });
  });

  describe('sendDeleteGlobalStateMessage', () => {
    it('should send DELETE_GLOBAL_STATE message via window.postMessage', () => {
      const globalStateId = 'state-123';

      sendDeleteGlobalStateMessage(globalStateId);

      // Verify real message was posted to window
      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      const message = postedMessages[0];

      expect(message.id).toMatch(/^path:/);
      expect(message.action).toBe('monkey-patch/DELETE_GLOBAL_STATE');
      expect(message.timestamp).toBe(123.456);

      // Payload is formatted/serialized by formatToStore
      const payload = typeof message.payload === 'string' ? JSON.parse(message.payload) : message.payload;
      expect(payload.globalStateId).toBe('state-123');
    });

    it('should handle different state ids', () => {
      const stateIds = ['state-1', 'state-abc', 'state-xyz-789'];

      stateIds.forEach((id, index) => {
        sendDeleteGlobalStateMessage(id);

        const message = postedMessages[index];
        expect(message.action).toBe('monkey-patch/DELETE_GLOBAL_STATE');

        const payload = typeof message.payload === 'string' ? JSON.parse(message.payload) : message.payload;
        expect(payload.globalStateId).toBe(id);
      });

      expect(postedMessages).toHaveLength(3);
    });
  });
});
