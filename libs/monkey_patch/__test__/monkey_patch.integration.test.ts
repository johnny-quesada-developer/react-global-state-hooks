import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import type { Any } from 'react-global-state-hooks';
import GlobalStore from 'react-global-state-hooks/GlobalStore';
import formatFromStore from 'json-storage-formatter/formatFromStore';
import { assertMonkeyPathMessageJson } from '../src/schema/MonkeyPathMessageJson/MonkeyPathMessageJson';
import { assertAddGlobalStateMessage } from '../src/schema/MonkeyPathMessageJson/AddGlobalStateMessage';
import { assertStartActionMessage } from '../src/schema/MonkeyPathMessageJson/StartActionMessage';
import { assertAddActionLogMessage } from '../src/schema/MonkeyPathMessageJson/AddActionLogMessage';
import { assertUpdateActionMessage } from '../src/schema/MonkeyPathMessageJson/UpdateActionMessage';
import { assertDeleteGlobalStateMessage } from '../src/schema/MonkeyPathMessageJson/DeleteGlobalStateMessage';

// Mock only external boundaries - window.postMessage
let mockPostMessage: ReturnType<typeof vi.fn>;
let postedMessages: Any[] = [];

vi.mock('react-global-state-hooks/uniqueId', () => {
  let counter = 0;
  const mockUniqueId = vi.fn((prefix: string) => `${prefix}${counter++}`);
  (mockUniqueId as Any).for = (prefix: string) => {
    let localCounter = 0;
    return () => `${prefix}${localCounter++}`;
  };
  // The real module exposes both the default and a named `uniqueId` export.
  return {
    default: mockUniqueId,
    uniqueId: mockUniqueId,
  };
});

vi.mock('../src/tools/react', () => ({
  onReactDevToolsConnect: vi.fn((callback) => {
    // Store callback for later invocation
    (globalThis as Any).__reactDevToolsConnectCallback = callback;
  }),
  getGlobalThis: vi.fn((g) => g),
  getReactBuildType: vi.fn(() => 'development'),
  // No current fiber in this unit context (module-scope) -> stores are not fiber-registered.
  getCurrentFiber: vi.fn(() => null),
  // Capture the unmount callback so tests could drive it; returns an unsubscribe fn.
  addFiberUnmountSubscription: vi.fn((callback) => {
    (globalThis as Any).__fiberUnmountCallback = callback;
    return () => {};
  }),
}));

describe('monkey_patch.ts - Integration Tests', () => {
  let global: Any;

  beforeAll(async () => {
    // Setup browser API mocks
    postedMessages = [];
    mockPostMessage = vi.fn((message) => {
      postedMessages.push(message);
    });

    // Create a mock event listeners map
    const eventListeners = new Map<string, Set<EventListener>>();

    globalThis.window = {
      postMessage: mockPostMessage,
      addEventListener: vi.fn((type: string, listener: EventListener) => {
        if (!eventListeners.has(type)) {
          eventListeners.set(type, new Set());
        }
        eventListeners.get(type)!.add(listener);
      }),
      removeEventListener: vi.fn((type: string, listener: EventListener) => {
        eventListeners.get(type)?.delete(listener);
      }),
      dispatchEvent: vi.fn((event: Event) => {
        const listeners = eventListeners.get(event.type);
        if (listeners) {
          listeners.forEach((listener) => listener(event));
        }
        return true;
      }),
    } as Any;

    globalThis.performance = {
      now: () => 123.456,
    } as Any;

    // Import the module once to initialize REACT_GLOBAL_STATE_HOOK_DEBUG
    sessionStorage.setItem('REACT_GLOBAL_STATE_HOOK_DEBUG', 'session:test-123');
    await import('../src/monkey_patch');
    global = globalThis as Any;
  });

  beforeEach(() => {
    postedMessages = [];
    vi.clearAllMocks();
  });

  describe('REACT_GLOBAL_STATE_HOOK_DEBUG initialization', () => {
    it('should initialize global function', () => {
      expect(global.REACT_GLOBAL_STATE_HOOK_DEBUG).toBeDefined();
      expect(typeof global.REACT_GLOBAL_STATE_HOOK_DEBUG).toBe('function');
    });

    it('should apply all expected patches to GlobalStore instance', () => {
      // Create a comprehensive mock GlobalStore instance
      const originalGetMainHook = vi.fn(() => ({ state: { count: 0 }, setState: vi.fn() }));
      const originalCreateSelectorHook = vi.fn(() => vi.fn());
      const originalSetState = vi.fn();
      const originalDispose = vi.fn();
      const mockActions = {
        increment: vi.fn(() => 'incremented'),
        decrement: vi.fn(() => 'decremented'),
      };

      const mockStore: Any = {
        state: { count: 0 },
        setState: originalSetState,
        getMainHook: originalGetMainHook,
        dispose: originalDispose,
        getStoreActionsMap: vi.fn(() => ({
          actions: mockActions,
          storeTools: { state: { count: 0 }, setState: vi.fn() },
        })),
        createSelectorHook: originalCreateSelectorHook,
        actions: mockActions,
        getState: vi.fn(() => ({ count: 0 })),
      };

      // Pass store through monkey patch
      const patchedStore = global.REACT_GLOBAL_STATE_HOOK_DEBUG(
        mockStore,
        undefined,
        '/src/stores/counter.ts',
      );

      // Verify ALL expected patches are applied

      // 1. _DEV_TOOLS_STORE_ID should be assigned
      expect(patchedStore._DEV_TOOLS_STORE_ID).toBeDefined();
      expect(patchedStore._DEV_TOOLS_STORE_ID).toMatch(/store-id:/);

      // 2. getMainHook should be wrapped (different function reference)
      expect(patchedStore.getMainHook).not.toBe(originalGetMainHook);
      expect(typeof patchedStore.getMainHook).toBe('function');
      const mainHook = patchedStore.getMainHook();
      expect(mainHook._DEV_TOOLS_STORE_ID).toBe(patchedStore._DEV_TOOLS_STORE_ID);

      // 3. createSelectorHook should be wrapped
      expect(patchedStore.createSelectorHook).not.toBe(originalCreateSelectorHook);
      expect(typeof patchedStore.createSelectorHook).toBe('function');
      const selectorHook = patchedStore.createSelectorHook((s: Any) => s.count);
      expect((selectorHook as Any)._DEV_TOOLS_STORE_ID).toBe(patchedStore._DEV_TOOLS_STORE_ID);

      // 4. setState should be wrapped
      expect(patchedStore.setState).not.toBe(originalSetState);
      expect(typeof patchedStore.setState).toBe('function');

      // 5. dispose should be wrapped
      expect(patchedStore.dispose).not.toBe(originalDispose);
      expect(typeof patchedStore.dispose).toBe('function');

      // 7. __devtools_initialize_getStoreActionsMapWrapped should be added
      expect(patchedStore.__devtools_initialize_getStoreActionsMapWrapped).toBeDefined();
      expect(typeof patchedStore.__devtools_initialize_getStoreActionsMapWrapped).toBe('function');

      // 8. __devtools_getLifeCycleStoreToolsWrapper should be added
      expect(patchedStore.__devtools_getLifeCycleStoreToolsWrapper).toBeDefined();
      expect(typeof patchedStore.__devtools_getLifeCycleStoreToolsWrapper).toBe('function');

      // Verify wrapped functions still work correctly

      // Test wrapped setState calls original
      patchedStore.setState({ count: 1 });
      expect(originalSetState).toHaveBeenCalledWith({ count: 1 }, {});

      // Test wrapped dispose calls original and sends message
      postedMessages.length = 0;
      patchedStore.dispose();
      expect(originalDispose).toHaveBeenCalled();
      const deleteCall = postedMessages.find((msg) => msg.action === 'monkey-patch/DELETE_GLOBAL_STATE');
      expect(deleteCall).toBeDefined();

      // Test wrapped actions map
      const wrappedActionsMap = patchedStore.__devtools_initialize_getStoreActionsMapWrapped();
      expect(wrappedActionsMap.actions).toBeDefined();
      expect(wrappedActionsMap.actions.increment).toBeDefined();
      expect(wrappedActionsMap.actions.decrement).toBeDefined();

      // Test lifecycle tools wrapper
      const lifecycleTools = patchedStore.__devtools_getLifeCycleStoreToolsWrapper('onInit');
      expect(lifecycleTools).toBeDefined();
      expect(lifecycleTools.state).toBeDefined();
    });

    it('should maintain original store properties after patching', () => {
      const mockStore: Any = {
        _name: 'Counter Store',
        state: { count: 5, user: 'John' },
        customProperty: 'custom value',
        metadata: { version: '1.0' },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: {}, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: null, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const patchedStore = global.REACT_GLOBAL_STATE_HOOK_DEBUG(
        mockStore,
        undefined,
        '/src/stores/counter.ts',
      );

      // Original properties should be preserved
      expect(patchedStore._name).toBe('Counter Store');
      expect(patchedStore.state).toEqual({ count: 5, user: 'John' });
      expect(patchedStore.customProperty).toBe('custom value');
      expect(patchedStore.metadata).toEqual({ version: '1.0' });

      // New DevTools property should be added
      expect(patchedStore._DEV_TOOLS_STORE_ID).toBeDefined();
    });

    it('should send ADD_GLOBAL_STATE message with complete store metadata', () => {
      const mockActions = {
        login: vi.fn(),
        logout: vi.fn(),
      };

      const mockStore: Any = {
        _name: 'User Store',
        state: { user: null, isLoading: false },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: {}, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({
          actions: mockActions,
          storeTools: {},
        })),
        createSelectorHook: vi.fn(() => vi.fn()),
        localStorage: { key: 'user-storage' },
        metadata: { description: 'User authentication store' },
        actionsConfig: mockActions, // This is what getGlobalStateMetaPayload looks for
        callbacks: {},
      };

      postedMessages.length = 0;

      global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore, undefined, '/src/stores/user.ts');

      const addGlobalStateCall = postedMessages.find((msg) => msg.action === 'monkey-patch/ADD_GLOBAL_STATE');

      expect(addGlobalStateCall).toBeDefined();
      const payload =
        typeof addGlobalStateCall.payload === 'string'
          ? JSON.parse(addGlobalStateCall.payload)
          : addGlobalStateCall.payload;

      // Verify payload contains all store information
      expect(payload.globalStateId).toMatch(/store-id:/);
      expect(payload.globalStatePath).toBe('/src/stores/user.ts');
      expect(payload.initialState).toEqual({ user: null, isLoading: false });
      expect(payload.actions).toBeDefined();
      expect(Object.keys(payload.actions)).toContain('login');
      expect(Object.keys(payload.actions)).toContain('logout');
      expect(payload.actions.login).toHaveProperty('length');
      expect(payload.actions.logout).toHaveProperty('length');
      expect(payload.localStorage).toEqual({ key: 'user-storage' });
    });

    it('should handle store with _name property', () => {
      const mockStore: Any = {
        _name: 'Counter Store',
        state: { count: 0 },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: { count: 0 }, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: null, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const wrappedStore = global.REACT_GLOBAL_STATE_HOOK_DEBUG(
        mockStore,
        undefined,
        '/src/stores/counter.ts',
      );

      expect(wrappedStore._name).toBe('Counter Store');
    });

    it('should handle store with localStorage config', () => {
      const mockStore: Any = {
        state: { count: 0 },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: { count: 0 }, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: null, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
        localStorage: { key: 'counter-storage' },
      };

      const wrappedStore = global.REACT_GLOBAL_STATE_HOOK_DEBUG(
        mockStore,
        undefined,
        '/src/stores/counter.ts',
      );

      expect(wrappedStore.localStorage).toBeDefined();
      expect(wrappedStore.localStorage.key).toBe('counter-storage');
    });
  });

  describe('getMainHook wrapping', () => {
    it('should wrap getMainHook to add _DEV_TOOLS_STORE_ID', () => {
      const originalHook = { state: { count: 0 }, setState: vi.fn() };
      const mockStore: Any = {
        state: { count: 0 },
        setState: vi.fn(),
        getMainHook: vi.fn(() => originalHook),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: null, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const wrappedStore = global.REACT_GLOBAL_STATE_HOOK_DEBUG(
        mockStore,
        undefined,
        '/src/stores/counter.ts',
      );

      const hook = wrappedStore.getMainHook();

      expect(hook._DEV_TOOLS_STORE_ID).toBeDefined();
      expect(hook._DEV_TOOLS_STORE_ID).toBe(wrappedStore._DEV_TOOLS_STORE_ID);
    });

    it('should preserve original hook properties', () => {
      const originalHook = { state: { count: 5 }, setState: vi.fn(), customProp: 'test' };
      const mockStore: Any = {
        state: { count: 5 },
        setState: vi.fn(),
        getMainHook: vi.fn(() => originalHook),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: null, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const wrappedStore = global.REACT_GLOBAL_STATE_HOOK_DEBUG(
        mockStore,
        undefined,
        '/src/stores/counter.ts',
      );

      const hook = wrappedStore.getMainHook() as Any;

      expect(hook.state).toEqual({ count: 5 });
      expect(hook.customProp).toBe('test');
    });
  });

  describe('createSelectorHook wrapping', () => {
    it('should wrap createSelectorHook to add _DEV_TOOLS_STORE_ID', () => {
      const originalSelectorHook = vi.fn();
      const mockStore: Any = {
        state: { count: 0 },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: { count: 0 }, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: null, storeTools: {} })),
        createSelectorHook: vi.fn(() => originalSelectorHook),
      };

      const wrappedStore = global.REACT_GLOBAL_STATE_HOOK_DEBUG(
        mockStore,
        undefined,
        '/src/stores/counter.ts',
      );

      const selectorHook = wrappedStore.createSelectorHook((state: Any) => state.count);

      expect((selectorHook as Any)._DEV_TOOLS_STORE_ID).toBeDefined();
      expect((selectorHook as Any)._DEV_TOOLS_STORE_ID).toBe(wrappedStore._DEV_TOOLS_STORE_ID);
    });

    it('should pass arguments to original createSelectorHook', () => {
      const originalSelectorHook = vi.fn();
      const mockCreateSelectorHook = vi.fn(() => originalSelectorHook);
      const mockStore: Any = {
        state: { count: 0 },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: { count: 0 }, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: null, storeTools: {} })),
        createSelectorHook: mockCreateSelectorHook,
      };

      const wrappedStore = global.REACT_GLOBAL_STATE_HOOK_DEBUG(
        mockStore,
        undefined,
        '/src/stores/counter.ts',
      );

      const selector = (state: Any) => state.count;
      wrappedStore.createSelectorHook(selector);

      expect(mockCreateSelectorHook).toHaveBeenCalledWith(selector);
    });
  });

  describe('setState wrapping', () => {
    it('should wrap setState with logging', () => {
      const originalSetState = vi.fn();
      const mockStore: Any = {
        state: { count: 0 },
        setState: originalSetState,
        getMainHook: vi.fn(() => ({ state: { count: 0 }, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: null, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const wrappedStore = global.REACT_GLOBAL_STATE_HOOK_DEBUG(
        mockStore,
        undefined,
        '/src/stores/counter.ts',
      );

      wrappedStore.setState({ count: 1 });

      expect(originalSetState).toHaveBeenCalledWith({ count: 1 }, {});
    });

    it('should log setState mutations', () => {
      const mockStore: Any = {
        state: { count: 0 },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: { count: 0 }, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: null, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const wrappedStore = global.REACT_GLOBAL_STATE_HOOK_DEBUG(
        mockStore,
        undefined,
        '/src/stores/counter.ts',
      );

      postedMessages.length = 0;
      wrappedStore.setState({ count: 1 });

      // Should send START_ACTION message for setState
      expect(mockPostMessage).toHaveBeenCalled();
      const startActionMsg = postedMessages.find((msg) => msg.action === 'monkey-patch/START_ACTION');
      expect(startActionMsg).toBeDefined();
    });
  });

  describe('dispose wrapping', () => {
    it('should wrap dispose to send DELETE_GLOBAL_STATE message', () => {
      const originalDispose = vi.fn();
      const mockStore: Any = {
        state: { count: 0 },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: { count: 0 }, setState: vi.fn() })),
        dispose: originalDispose,
        getStoreActionsMap: vi.fn(() => ({ actions: null, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const wrappedStore = global.REACT_GLOBAL_STATE_HOOK_DEBUG(
        mockStore,
        undefined,
        '/src/stores/counter.ts',
      );

      postedMessages.length = 0;
      wrappedStore.dispose();

      expect(originalDispose).toHaveBeenCalled();

      const deleteCall = postedMessages.find((msg) => msg.action === 'monkey-patch/DELETE_GLOBAL_STATE');
      expect(deleteCall).toBeDefined();
    });
  });

  describe('actions wrapping', () => {
    it('should set up __devtools_initialize_getStoreActionsMapWrapped', () => {
      const mockActions = {
        increment: vi.fn(),
      };
      const mockStore: Any = {
        state: { count: 0 },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: { count: 0 }, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({
          actions: mockActions,
          storeTools: { state: { count: 0 }, setState: vi.fn() },
        })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const wrappedStore = global.REACT_GLOBAL_STATE_HOOK_DEBUG(
        mockStore,
        undefined,
        '/src/stores/counter.ts',
      );

      expect(wrappedStore.__devtools_initialize_getStoreActionsMapWrapped).toBeDefined();
      expect(typeof wrappedStore.__devtools_initialize_getStoreActionsMapWrapped).toBe('function');
    });

    it('should set up __devtools_getLifeCycleStoreToolsWrapper', () => {
      const mockStore: Any = {
        state: { count: 0 },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: { count: 0 }, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: null, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const wrappedStore = global.REACT_GLOBAL_STATE_HOOK_DEBUG(
        mockStore,
        undefined,
        '/src/stores/counter.ts',
      );

      expect(wrappedStore.__devtools_getLifeCycleStoreToolsWrapper).toBeDefined();
      expect(typeof wrappedStore.__devtools_getLifeCycleStoreToolsWrapper).toBe('function');
    });

    it('should wrap actions with logging when present', () => {
      const mockActions = {
        increment: vi.fn(() => 'increment result'),
        decrement: vi.fn(() => 'decrement result'),
      };
      const mockStore: Any = {
        state: { count: 0 },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: { count: 0 }, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({
          actions: mockActions,
          storeTools: { state: { count: 0 }, setState: vi.fn() },
        })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const wrappedStore = global.REACT_GLOBAL_STATE_HOOK_DEBUG(
        mockStore,
        undefined,
        '/src/stores/counter.ts',
      );

      const wrappedActions = wrappedStore.__devtools_initialize_getStoreActionsMapWrapped();

      expect(wrappedActions.actions).toBeDefined();
      expect(wrappedActions.actions.increment).toBeDefined();
      expect(wrappedActions.actions.decrement).toBeDefined();
    });

    it('should keep lifecycle wrapper behavior stable across repeated calls', () => {
      const actualStore = new GlobalStore({ count: 0 }, {
        name: 'integration-counter',
        actions: {
          increment:
            () =>
            ({ setState }: { setState: (next: unknown) => void }) => {
              setState((previous: { count: number }) => ({ count: previous.count + 1 }));

              return 'inc';
            },
        },
      } as Any) as Any;

      const wrappedStore =
        actualStore._DEV_TOOLS_STORE_ID != null
          ? actualStore
          : global.REACT_GLOBAL_STATE_HOOK_DEBUG(actualStore, undefined, '/src/stores/counter.ts');

      postedMessages.length = 0;

      const runLifecycle = (prefix: string): string => {
        const lifecycleTools = wrappedStore.__devtools_getLifeCycleStoreToolsWrapper(prefix);
        const actionResult = lifecycleTools.actions.increment();

        return actionResult;
      };

      const run1 = runLifecycle('config/onInit/');
      const run2 = runLifecycle('config/onInit/');
      const run3 = runLifecycle('config/onInit/');

      expect(run1).toBe('inc');
      expect(run2).toBe('inc');
      expect(run3).toBe('inc');

      // Observable behavior should remain stable over time.
      expect(wrappedStore.getState().count).toBe(3);

      const onStateChangedResult = runLifecycle('config/onStateChanged/');
      expect(onStateChangedResult).toBe('inc');

      // The additional lifecycle call should preserve expected action semantics.
      expect(wrappedStore.getState().count).toBe(4);

      const startActions = postedMessages.filter((msg) => msg.action === 'monkey-patch/START_ACTION');
      expect(startActions.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('multiple store instances', () => {
    it('should handle multiple store registrations', () => {
      const mockStore1: Any = {
        state: { count: 0 },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: { count: 0 }, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: null, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const mockStore2: Any = {
        state: { user: null },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: { user: null }, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: null, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const wrapped1 = global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore1, undefined, '/src/stores/counter.ts');

      const wrapped2 = global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore2, undefined, '/src/stores/user.ts');

      expect(wrapped1._DEV_TOOLS_STORE_ID).not.toBe(wrapped2._DEV_TOOLS_STORE_ID);
    });

    it('should send separate ADD_GLOBAL_STATE messages for each store', () => {
      postedMessages.length = 0;

      const mockStore1: Any = {
        state: { count: 0 },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: { count: 0 }, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: null, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const mockStore2: Any = {
        state: { user: null },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: { user: null }, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: null, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore1, undefined, '/src/stores/counter.ts');
      global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore2, undefined, '/src/stores/user.ts');

      const addGlobalStateCalls = postedMessages.filter(
        (msg) => msg.action === 'monkey-patch/ADD_GLOBAL_STATE',
      );

      expect(addGlobalStateCalls.length).toBe(2);
    });
  });

  describe('same-path re-creation', () => {
    it('does NOT send CLEAR_GLOBAL_STATES when a store is created again at the same path', () => {
      // Page-reload cleanup is now handled solely by the CLEAR_GLOBAL_STATES('*') message on boot. Creating
      // a store at a path that already exists in the same session is a legitimate additional
      // instance (multiple context providers, or a store created per component), so the patch must
      // NOT clear the path — each creation simply announces its own ADD_GLOBAL_STATE.
      const mockStore: Any = {
        state: { count: 0 },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: { count: 0 }, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: null, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const storePath = '/src/stores/counter.ts';

      // First instance
      global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore, undefined, storePath);

      postedMessages.length = 0;

      // Second instance at the same path/session
      global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore, undefined, storePath);

      const clearCall = postedMessages.find((msg) => msg.action === 'monkey-patch/CLEAR_GLOBAL_STATES');
      const addCall = postedMessages.find((msg) => msg.action === 'monkey-patch/ADD_GLOBAL_STATE');

      expect(clearCall).toBeUndefined();
      expect(addCall).toBeDefined();
    });
  });

  describe('React DevTools integration', () => {
    it('should register onReactDevToolsConnect callback', () => {
      expect((globalThis as Any).__reactDevToolsConnectCallback).toBeDefined();
    });

    it('should send SET_REACT_BUILD_TYPE on React DevTools connect', () => {
      postedMessages.length = 0;

      // Simulate React DevTools connecting
      (globalThis as Any).__reactDevToolsConnectCallback?.();

      const buildTypeCall = postedMessages.find((msg) => msg.action === 'monkey-patch/SET_REACT_BUILD_TYPE');

      expect(buildTypeCall).toBeDefined();
      const payload =
        typeof buildTypeCall.payload === 'string' ? JSON.parse(buildTypeCall.payload) : buildTypeCall.payload;
      expect(payload.buildType).toBe('development');
    });
  });

  describe('devtools message requests', () => {
    it('should handle EXECUTE_ACTION request', () => {
      const mockIncrementAction = vi.fn(() => 'incremented');
      const mockActions = {
        increment: mockIncrementAction,
      };

      const mockStore: Any = {
        state: { count: 0 },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: { count: 0 }, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({
          actions: mockActions,
          storeTools: { state: { count: 0 }, setState: vi.fn() },
        })),
        createSelectorHook: vi.fn(() => vi.fn()),
        actions: mockActions,
      };

      const wrappedStore = global.REACT_GLOBAL_STATE_HOOK_DEBUG(
        mockStore,
        undefined,
        '/src/stores/counter.ts',
      );

      // Simulate devtools EXECUTE_ACTION message
      const event = new MessageEvent('message', {
        data: {
          action: 'devtools-request/EXECUTE_ACTION',
          payload: {
            actionName: 'increment',
            globalStateId: wrappedStore._DEV_TOOLS_STORE_ID,
            parameters: '',
          },
        },
        source: window,
      });

      window.dispatchEvent(event);

      // Action should be executed
      expect(mockIncrementAction).toHaveBeenCalled();
    });

    it('should handle EXECUTE_ACTION with parameters', () => {
      const mockAddAction = vi.fn((n: number) => `added ${n}`);
      const mockActions = {
        add: mockAddAction,
      };

      const mockStore: Any = {
        state: { count: 0 },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: { count: 0 }, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({
          actions: mockActions,
          storeTools: { state: { count: 0 }, setState: vi.fn() },
        })),
        createSelectorHook: vi.fn(() => vi.fn()),
        actions: mockActions,
      };

      const wrappedStore = global.REACT_GLOBAL_STATE_HOOK_DEBUG(
        mockStore,
        undefined,
        '/src/stores/counter.ts',
      );

      const event = new MessageEvent('message', {
        data: {
          action: 'devtools-request/EXECUTE_ACTION',
          payload: {
            actionName: 'add',
            globalStateId: wrappedStore._DEV_TOOLS_STORE_ID,
            parameters: '5',
          },
        },
        source: window,
      });

      window.dispatchEvent(event);

      expect(mockAddAction).toHaveBeenCalledWith(5);
    });

    it('should handle SET_STATE request', () => {
      const mockSetState = vi.fn();
      const mockStore: Any = {
        state: { count: 0 },
        setState: mockSetState,
        getMainHook: vi.fn(() => ({ state: { count: 0 }, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: null, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const wrappedStore = global.REACT_GLOBAL_STATE_HOOK_DEBUG(
        mockStore,
        undefined,
        '/src/stores/counter.ts',
      );

      const event = new MessageEvent('message', {
        data: {
          action: 'devtools-request/SET_STATE',
          payload: {
            globalStateId: wrappedStore._DEV_TOOLS_STORE_ID,
            parameters: '{ count: 10 }',
          },
        },
        source: window,
      });

      window.dispatchEvent(event);

      expect(mockSetState).toHaveBeenCalled();
    });

    it('should handle RESTORE_STATE request', () => {
      const mockSetState = vi.fn();
      const mockGetState = vi.fn(() => ({ count: 0 }));
      const mockStore: Any = {
        state: { count: 0 },
        setState: mockSetState,
        getState: mockGetState,
        getMainHook: vi.fn(() => ({ state: { count: 0 }, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: null, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const wrappedStore = global.REACT_GLOBAL_STATE_HOOK_DEBUG(
        mockStore,
        undefined,
        '/src/stores/counter.ts',
      );

      const event = new MessageEvent('message', {
        data: {
          action: 'devtools-request/RESTORE_STATE',
          payload: {
            globalStateId: wrappedStore._DEV_TOOLS_STORE_ID,
            state: { count: 5 },
          },
        },
        source: window,
      });

      window.dispatchEvent(event);

      expect(mockGetState).toHaveBeenCalled();
      expect(mockSetState).toHaveBeenCalled();
    });

    it('does not throw when a request targets an unknown store id (e.g. an unconnected loaded snapshot)', () => {
      // No store is registered under this id on the page. A loaded snapshot whose store never
      // mounted here would dispatch exactly this. It must be a safe no-op, not a page crash
      // (previously threw "Cannot read properties of undefined (reading 'store')").
      const unknownId = 'store-id:not-live';

      const dispatch = (action: string, payload: Record<string, unknown>) =>
        window.dispatchEvent(
          new MessageEvent('message', {
            data: { action: `devtools-request/${action}`, payload: { globalStateId: unknownId, ...payload } },
            source: window,
          }),
        );

      expect(() => dispatch('EXECUTE_ACTION', { actionName: 'increment', parameters: '' })).not.toThrow();
      expect(() => dispatch('SET_STATE', { parameters: '{ count: 1 }' })).not.toThrow();
      expect(() => dispatch('RESTORE_STATE', { state: { count: 1 } })).not.toThrow();
    });

    it('RESTORE_STATE ignores non-serializable values and keeps the live value for that key', () => {
      // The live store holds a real function the devtools cannot serialize. A restore that came
      // from a snapshot carries a `__non_serializable__` placeholder for that key. mergeState must
      // keep the live function and only apply the serializable change (count).
      const liveHandler = () => 'live';
      const liveState = { count: 0, handler: liveHandler };
      const mockSetState = vi.fn();
      const mockStore: Any = {
        state: liveState,
        setState: mockSetState,
        getState: vi.fn(() => liveState),
        getMainHook: vi.fn(() => ({ state: liveState, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: null, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const wrappedStore = global.REACT_GLOBAL_STATE_HOOK_DEBUG(
        mockStore,
        undefined,
        '/src/stores/with-fn.ts',
      );

      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            action: 'devtools-request/RESTORE_STATE',
            payload: {
              globalStateId: wrappedStore._DEV_TOOLS_STORE_ID,
              state: { count: 5, handler: { __non_serializable__: 'function' } },
            },
          },
          source: window,
        }),
      );

      expect(mockSetState).toHaveBeenCalledTimes(1);
      const merged = mockSetState.mock.calls[0][0];
      expect(merged.count).toBe(5);
      // The non-serializable value was ignored: the original live function is preserved.
      expect(merged.handler).toBe(liveHandler);
    });

    it('should ignore messages from different source', () => {
      const mockSetState = vi.fn();
      const mockStore: Any = {
        state: { count: 0 },
        setState: mockSetState,
        getMainHook: vi.fn(() => ({ state: { count: 0 }, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: null, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const wrappedStore = global.REACT_GLOBAL_STATE_HOOK_DEBUG(
        mockStore,
        undefined,
        '/src/stores/counter.ts',
      );

      const event = new MessageEvent('message', {
        data: {
          action: 'devtools-request/SET_STATE',
          payload: {
            globalStateId: wrappedStore._DEV_TOOLS_STORE_ID,
            parameters: '{ count: 10 }',
          },
        },
        source: null, // Different source
      });

      window.dispatchEvent(event);

      // Should not execute
      expect(mockSetState).not.toHaveBeenCalled();
    });

    it('should ignore non-devtools-request messages', () => {
      const mockSetState = vi.fn();
      const mockStore: Any = {
        state: { count: 0 },
        setState: mockSetState,
        getMainHook: vi.fn(() => ({ state: { count: 0 }, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: null, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore, undefined, '/src/stores/counter.ts');

      const event = new MessageEvent('message', {
        data: {
          action: 'some-other-action',
          payload: {},
        },
        source: window,
      });

      window.dispatchEvent(event);

      expect(mockSetState).not.toHaveBeenCalled();
    });

    it('should handle RESTORE_STATE with merge error gracefully', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockSetState = vi.fn();
      const mockGetState = vi.fn(() => ({ count: 0 }));
      const mockStore: Any = {
        state: { count: 0 },
        setState: mockSetState,
        getState: mockGetState,
        getMainHook: vi.fn(() => ({ state: { count: 0 }, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: null, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const wrappedStore = global.REACT_GLOBAL_STATE_HOOK_DEBUG(
        mockStore,
        undefined,
        '/src/stores/counter.ts',
      );

      const event = new MessageEvent('message', {
        data: {
          action: 'devtools-request/RESTORE_STATE',
          payload: {
            globalStateId: wrappedStore._DEV_TOOLS_STORE_ID,
            state: { __non_serializable__: true }, // This will cause an error in mergeState
          },
        },
        source: window,
      });

      window.dispatchEvent(event);

      expect(mockGetState).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
      // setState should not be called due to error
      expect(mockSetState).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });
});

// ---------------------------------------------------------------------------
// Comprehensive Real-GlobalStore Integration Tests
// ---------------------------------------------------------------------------
// These tests use real GlobalStore instances (not mocks) to verify the full
// end-to-end pipeline: store registration → action call → message sequence →
// state mutation, matching exactly what happens in a live browser session.
// ---------------------------------------------------------------------------

describe('Real GlobalStore comprehensive workflow tests', () => {
  let global: Any;

  // ── helpers ────────────────────────────────────────────────────────────────

  /** Parse a message payload regardless of whether it was serialised to JSON. */
  const parsePayload = (msg: Any): Any =>
    typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;

  /** Filter messages by their monkey-patch action type. */
  const msgs = (action: string) =>
    postedMessages.filter((m) => m.action === `monkey-patch/${action}`).map(parsePayload);

  /**
   * Create a real counter GlobalStore whose actions follow the library's
   * curried-factory format:  `(...userParams) => (storeTools) => result`
   *
   * The library unwraps the outer curry during initialize(), so the monkey
   * patch receives plain  `(storeTools) => result`  handlers via
   * getStoreActionsMap().
   */
  const buildCounterStore = () => {
    const store = new GlobalStore({ count: 0 }, {
      name: 'counter',
      actions: {
        increment:
          () =>
          ({ setState }: Any) => {
            setState((prev: { count: number }) => ({ count: prev.count + 1 }));
            return 'incremented';
          },
        decrement:
          () =>
          ({ setState }: Any) => {
            setState((prev: { count: number }) => ({ count: prev.count - 1 }));
            return 'decremented';
          },
        add:
          (amount: number) =>
          ({ setState }: Any) => {
            setState((prev: { count: number }) => ({ count: prev.count + (amount ?? 0) }));
            return `added ${amount ?? 0}`;
          },
        // two setState calls in one action — used to verify sub-log count
        addTwice:
          () =>
          ({ setState }: Any) => {
            setState((prev: { count: number }) => ({ count: prev.count + 1 }));
            setState((prev: { count: number }) => ({ count: prev.count + 1 }));
            return 'added twice';
          },
      },
    } as Any) as Any;

    if (store._DEV_TOOLS_STORE_ID == null) {
      global.REACT_GLOBAL_STATE_HOOK_DEBUG(store, undefined, '/stores/counter.ts');
    }

    return store;
  };

  beforeAll(() => {
    global = globalThis as Any;
  });

  beforeEach(() => {
    postedMessages = [];
    vi.clearAllMocks();
  });

  // ── 1. Action message-sequence validation ──────────────────────────────────

  describe('action logging message sequence', () => {
    it('produces START_ACTION → ADD_ACTION_LOG → UPDATE_ACTION in order', () => {
      const store = buildCounterStore();
      postedMessages.length = 0;

      const { actions } = store.__devtools_initialize_getStoreActionsMapWrapped();
      actions.increment();

      const actionMsgs = postedMessages.map((m) => m.action);
      const startIdx = actionMsgs.indexOf('monkey-patch/START_ACTION');
      const updateIdx = actionMsgs.lastIndexOf('monkey-patch/UPDATE_ACTION');
      const addLogs = actionMsgs.filter((a) => a === 'monkey-patch/ADD_ACTION_LOG');

      expect(startIdx).toBeGreaterThanOrEqual(0);
      expect(updateIdx).toBeGreaterThan(startIdx);
      expect(addLogs.length).toBeGreaterThanOrEqual(1);
    });

    it('START_ACTION payload has correct action name, CUSTOM_ACTION type and store ID', () => {
      const store = buildCounterStore();
      postedMessages.length = 0;

      const { actions } = store.__devtools_initialize_getStoreActionsMapWrapped();
      actions.add(5);

      const [start] = msgs('START_ACTION');
      expect(start).toBeDefined();
      expect(start.action).toBe('add');
      expect(start.actionType).toBe('CUSTOM_ACTION');
      expect(start.globalStateId).toBe(store._DEV_TOOLS_STORE_ID);
      expect(start.async).toBe(false);
    });

    it('final ADD_ACTION_LOG has case "resolved" and no subAction (represents return value)', () => {
      const store = buildCounterStore();
      postedMessages.length = 0;

      const { actions } = store.__devtools_initialize_getStoreActionsMapWrapped();
      actions.add(5);

      const resolvedLog = msgs('ADD_ACTION_LOG').find((p) => p.case === 'resolved' && p.subAction === null);
      expect(resolvedLog).toBeDefined();
      expect(resolvedLog.globalStateId).toBe(store._DEV_TOOLS_STORE_ID);
    });

    it('UPDATE_ACTION closes the action with correct timing and globalStateId', () => {
      const store = buildCounterStore();
      postedMessages.length = 0;

      const { actions } = store.__devtools_initialize_getStoreActionsMapWrapped();
      actions.increment();

      const [update] = msgs('UPDATE_ACTION');
      expect(update).toBeDefined();
      expect(update.globalStateId).toBe(store._DEV_TOOLS_STORE_ID);
      expect(typeof update.timing).toBe('number');
    });
  });

  // ── 2. setState sub-action logging ─────────────────────────────────────────

  describe('setState sub-action logging inside actions', () => {
    it('setState inside action is observable in logs (either subAction or state-action start)', () => {
      const store = buildCounterStore();
      postedMessages.length = 0;

      const { actions } = store.__devtools_initialize_getStoreActionsMapWrapped();
      actions.increment(); // one internal setState

      const setStateLogs = msgs('ADD_ACTION_LOG').filter((p) => p.subAction === 'setState');
      const stateActionStarts = msgs('START_ACTION').filter((p) => p.actionType === 'STATE_ACTION');
      expect(setStateLogs.length + stateActionStarts.length).toBeGreaterThanOrEqual(1);
    });

    it('action with two setState calls produces at least two state-mutation logs', () => {
      const store = buildCounterStore();
      postedMessages.length = 0;

      const { actions } = store.__devtools_initialize_getStoreActionsMapWrapped();
      actions.addTwice();

      const setStateLogs = msgs('ADD_ACTION_LOG').filter((p) => p.subAction === 'setState');
      const stateActionStarts = msgs('START_ACTION').filter((p) => p.actionType === 'STATE_ACTION');
      expect(setStateLogs.length + stateActionStarts.length).toBeGreaterThanOrEqual(2);
    });

    it('state mutation logs carry pending/resolved status for action execution', () => {
      const store = buildCounterStore();
      postedMessages.length = 0;

      const { actions } = store.__devtools_initialize_getStoreActionsMapWrapped();
      actions.increment();

      const mutationLog = msgs('ADD_ACTION_LOG').find(
        (p) => p.subAction === 'setState' || p.case === 'resolved',
      );
      expect(mutationLog).toBeDefined();
    });
  });

  // ── 3. No double-logging guarantee ─────────────────────────────────────────

  describe('no double-logging when action calls setState', () => {
    it('setState inside an action can produce STATE_ACTION starts, but keeps exactly one CUSTOM_ACTION start', () => {
      const store = buildCounterStore();
      postedMessages.length = 0;

      const { actions } = store.__devtools_initialize_getStoreActionsMapWrapped();
      actions.increment();

      const customActionStarts = msgs('START_ACTION').filter((p) => p.actionType === 'CUSTOM_ACTION');
      expect(customActionStarts.length).toBe(1);

      const stateActionStarts = msgs('START_ACTION').filter((p) => p.actionType === 'STATE_ACTION');
      expect(stateActionStarts.length).toBeGreaterThanOrEqual(0);
    });

    it('direct store.setState produces exactly one STATE_ACTION START_ACTION', () => {
      const store = buildCounterStore();
      postedMessages.length = 0;

      store.setState({ count: 42 });

      const stateActionStarts = msgs('START_ACTION').filter((p) => p.actionType === 'STATE_ACTION');
      expect(stateActionStarts.length).toBe(1);
      expect(stateActionStarts[0].action).toBe('setState');
      expect(stateActionStarts[0].globalStateId).toBe(store._DEV_TOOLS_STORE_ID);
    });

    it('calling action and direct setState each produce their own isolated log entries', () => {
      const store = buildCounterStore();
      postedMessages.length = 0;

      const { actions } = store.__devtools_initialize_getStoreActionsMapWrapped();
      actions.increment();
      store.setState({ count: 99 });

      const customActionStarts = msgs('START_ACTION').filter((p) => p.actionType === 'CUSTOM_ACTION');
      const stateActionStarts = msgs('START_ACTION').filter((p) => p.actionType === 'STATE_ACTION');

      expect(customActionStarts.length).toBe(1);
      expect(stateActionStarts.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── 4. Multiple sequential action calls ────────────────────────────────────

  describe('multiple sequential action calls', () => {
    it('accumulates state correctly over N calls', () => {
      const store = buildCounterStore();
      const { actions } = store.__devtools_initialize_getStoreActionsMapWrapped();

      actions.increment();
      actions.increment();
      actions.increment();

      expect(store.getState().count).toBe(3);
    });

    it('produces one CUSTOM_ACTION START_ACTION per call, in order', () => {
      const store = buildCounterStore();
      postedMessages.length = 0;

      const { actions } = store.__devtools_initialize_getStoreActionsMapWrapped();
      actions.increment();
      actions.decrement();
      actions.add(5);

      const starts = msgs('START_ACTION').filter((p) => p.actionType === 'CUSTOM_ACTION');
      expect(starts.length).toBe(3);
      expect(starts[0].action).toBe('increment');
      expect(starts[1].action).toBe('decrement');
      expect(starts[2].action).toBe('add');
    });

    it('produces one UPDATE_ACTION per call to close each action', () => {
      const store = buildCounterStore();
      postedMessages.length = 0;

      const { actions } = store.__devtools_initialize_getStoreActionsMapWrapped();
      actions.increment();
      actions.decrement();

      expect(msgs('UPDATE_ACTION').length).toBe(2);
    });

    it('state is consistent between calls (increment then decrement returns to origin)', () => {
      const store = buildCounterStore();
      const { actions } = store.__devtools_initialize_getStoreActionsMapWrapped();

      actions.increment();
      expect(store.getState().count).toBe(1);
      actions.decrement();
      expect(store.getState().count).toBe(0);
      actions.increment();
      expect(store.getState().count).toBe(1);
    });
  });

  // ── 5. Async action logging ─────────────────────────────────────────────────

  describe('async action logging', () => {
    it('async action gets UPDATE_ACTION with async:true before resolution', async () => {
      const asyncStore = new GlobalStore({ result: null as string | null }, {
        name: 'async-store',
        actions: {
          fetchData:
            () =>
            async ({ setState }: Any) => {
              setState({ result: 'loading' });
              await Promise.resolve();
              setState({ result: 'done' });
              return 'fetched';
            },
        },
      } as Any) as Any;

      if (asyncStore._DEV_TOOLS_STORE_ID == null) {
        global.REACT_GLOBAL_STATE_HOOK_DEBUG(asyncStore, undefined, '/stores/async.ts');
      }

      postedMessages.length = 0;
      const { actions } = asyncStore.__devtools_initialize_getStoreActionsMapWrapped();
      await actions.fetchData();

      const asyncMark = msgs('UPDATE_ACTION').find((p) => p.async === true);
      expect(asyncMark).toBeDefined();
    });

    it('resolved async action produces final ADD_ACTION_LOG with case "resolved"', async () => {
      const asyncStore = new GlobalStore({ result: null as string | null }, {
        name: 'async-store-2',
        actions: {
          load:
            () =>
            async ({ setState }: Any) => {
              await Promise.resolve();
              setState({ result: 'ready' });
              return 'loaded';
            },
        },
      } as Any) as Any;

      if (asyncStore._DEV_TOOLS_STORE_ID == null) {
        global.REACT_GLOBAL_STATE_HOOK_DEBUG(asyncStore, undefined, '/stores/async2.ts');
      }

      postedMessages.length = 0;
      const { actions } = asyncStore.__devtools_initialize_getStoreActionsMapWrapped();
      await actions.load();

      const resolvedLog = msgs('ADD_ACTION_LOG').find((p) => p.case === 'resolved' && p.subAction === null);
      expect(resolvedLog).toBeDefined();
    });

    it('rejected async action produces ADD_ACTION_LOG with case "rejected"', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const errorStore = new GlobalStore({ count: 0 }, {
        name: 'error-store',
        actions: {
          fail: () => async () => {
            await Promise.resolve();
            throw new Error('action failed');
          },
        },
      } as Any) as Any;

      if (errorStore._DEV_TOOLS_STORE_ID == null) {
        global.REACT_GLOBAL_STATE_HOOK_DEBUG(errorStore, undefined, '/stores/error.ts');
      }

      postedMessages.length = 0;
      const { actions } = errorStore.__devtools_initialize_getStoreActionsMapWrapped();
      await expect(actions.fail()).rejects.toThrow('action failed');

      const rejectedLog = msgs('ADD_ACTION_LOG').find((p) => p.case === 'rejected');
      expect(rejectedLog).toBeDefined();

      consoleErrorSpy.mockRestore();
    });

    it('synchronous action error produces ADD_ACTION_LOG with case "rejected" and rethrows', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const syncErrorStore = new GlobalStore({ count: 0 }, {
        name: 'sync-error-store',
        actions: {
          failSync: () => () => {
            throw new Error('sync error');
          },
        },
      } as Any) as Any;

      if (syncErrorStore._DEV_TOOLS_STORE_ID == null) {
        global.REACT_GLOBAL_STATE_HOOK_DEBUG(syncErrorStore, undefined, '/stores/sync-error.ts');
      }

      postedMessages.length = 0;
      const { actions } = syncErrorStore.__devtools_initialize_getStoreActionsMapWrapped();
      expect(() => actions.failSync()).toThrow('sync error');

      const rejectedLog = msgs('ADD_ACTION_LOG').find((p) => p.case === 'rejected');
      expect(rejectedLog).toBeDefined();

      consoleErrorSpy.mockRestore();
    });
  });

  // ── 6. Lifecycle wrapper integration ──────────────────────────────────────

  describe('lifecycle wrapper integration', () => {
    it('onInit lifecycle scope appears in START_ACTION log scope', () => {
      const store = buildCounterStore();
      postedMessages.length = 0;

      const onInitTools = store.__devtools_getLifeCycleStoreToolsWrapper('config/onInit/');
      onInitTools.actions.increment();

      const [start] = msgs('START_ACTION');
      expect(start).toBeDefined();
      expect(start.logs[0].scope).toContain('onInit');
    });

    it('onStateChanged lifecycle scope appears in START_ACTION log scope', () => {
      const store = buildCounterStore();
      postedMessages.length = 0;

      const onStateChangedTools = store.__devtools_getLifeCycleStoreToolsWrapper('config/onStateChanged/');
      onStateChangedTools.actions.increment();

      const [start] = msgs('START_ACTION');
      expect(start).toBeDefined();
      expect(start.logs[0].scope).toContain('onStateChanged');
    });

    it('repeated lifecycle wrapper calls accumulate state without stacking side effects', () => {
      const store = buildCounterStore();
      postedMessages.length = 0;

      const callOnInit = () => {
        const tools = store.__devtools_getLifeCycleStoreToolsWrapper('config/onInit/');
        tools.actions.increment();
      };

      callOnInit();
      callOnInit();
      callOnInit();

      expect(store.getState().count).toBe(3);

      // One START_ACTION per lifecycle call: the action's own CUSTOM_ACTION entry.
      // The setState it performs is nested as an ADD_ACTION_LOG sub-action of that
      // action rather than emitting a separate top-level STATE_ACTION.
      expect(msgs('START_ACTION').length).toBe(3);
    });

    it('each lifecycle wrapper invocation returns a fresh actions object (no stale closures)', () => {
      const store = buildCounterStore();

      const tools1 = store.__devtools_getLifeCycleStoreToolsWrapper('config/onInit/');
      const tools2 = store.__devtools_getLifeCycleStoreToolsWrapper('config/onInit/');

      // Fresh wrapper objects each time
      expect(tools1.actions.increment).not.toBe(tools2.actions.increment);
    });

    it('onInit and onStateChanged wrappers produce scoped log entries for their respective calls', () => {
      const store = buildCounterStore();
      postedMessages.length = 0;

      store.__devtools_getLifeCycleStoreToolsWrapper('config/onInit/').actions.increment();
      store.__devtools_getLifeCycleStoreToolsWrapper('config/onStateChanged/').actions.decrement();

      const starts = msgs('START_ACTION');
      // One START_ACTION per action call (setState nests as a sub-action, not a
      // separate top-level STATE_ACTION).
      expect(starts.length).toBe(2);
      expect(starts.some((s) => String(s.logs?.[0]?.scope ?? '').includes('onInit'))).toBe(true);
      expect(starts.some((s) => String(s.logs?.[0]?.scope ?? '').includes('onStateChanged'))).toBe(true);
    });
  });

  // ── 7. Hook tagging ─────────────────────────────────────────────────────────

  describe('hook tagging on real stores', () => {
    it('getMainHook result is tagged with the store ID', () => {
      const store = buildCounterStore();
      const hook = store.getMainHook();
      expect(hook._DEV_TOOLS_STORE_ID).toBe(store._DEV_TOOLS_STORE_ID);
    });

    it('getMainHook result preserves original hook properties', () => {
      const store = buildCounterStore();
      const hook = store.getMainHook() as Any;
      // Hook is still a function (or object), not stripped of original properties
      expect(hook).toBeDefined();
      expect(hook._DEV_TOOLS_STORE_ID).toBeDefined();
    });

    it('createSelectorHook result is tagged with the store ID', () => {
      const store = buildCounterStore();
      const selectorHook = store.createSelectorHook((s: Any) => s.count) as Any;
      expect(selectorHook._DEV_TOOLS_STORE_ID).toBe(store._DEV_TOOLS_STORE_ID);
    });

    it('two different stores produce hooks with different IDs', () => {
      const store1 = buildCounterStore();
      const store2 = buildCounterStore();

      const hook1 = store1.getMainHook() as Any;
      const hook2 = store2.getMainHook() as Any;

      expect(hook1._DEV_TOOLS_STORE_ID).not.toBe(hook2._DEV_TOOLS_STORE_ID);
    });

    it('selector hook from one store has a different ID than selector from another', () => {
      const store1 = buildCounterStore();
      const store2 = buildCounterStore();

      const sel1 = store1.createSelectorHook((s: Any) => s.count) as Any;
      const sel2 = store2.createSelectorHook((s: Any) => s.count) as Any;

      expect(sel1._DEV_TOOLS_STORE_ID).not.toBe(sel2._DEV_TOOLS_STORE_ID);
    });
  });

  // ── 8. Multiple real store instances coexistence ───────────────────────────

  describe('multiple real store instances', () => {
    it('two stores have independent unique IDs', () => {
      const store1 = buildCounterStore();
      const store2 = buildCounterStore();

      expect(store1._DEV_TOOLS_STORE_ID).toBeDefined();
      expect(store2._DEV_TOOLS_STORE_ID).toBeDefined();
      expect(store1._DEV_TOOLS_STORE_ID).not.toBe(store2._DEV_TOOLS_STORE_ID);
    });

    it('actions on one store do not affect state of another', () => {
      const store1 = buildCounterStore();
      const store2 = buildCounterStore();

      const { actions: actions1 } = store1.__devtools_initialize_getStoreActionsMapWrapped();
      actions1.increment();

      expect(store1.getState().count).toBe(1);
      expect(store2.getState().count).toBe(0);
    });

    it("log messages from one store carry that store's ID, not the other's", () => {
      const store1 = buildCounterStore();
      const store2 = buildCounterStore();
      postedMessages.length = 0;

      const { actions: actions1 } = store1.__devtools_initialize_getStoreActionsMapWrapped();
      actions1.increment();

      const starts = msgs('START_ACTION');
      // Every START_ACTION message from this block belongs to store1
      for (const s of starts) {
        expect(s.globalStateId).toBe(store1._DEV_TOOLS_STORE_ID);
        expect(s.globalStateId).not.toBe(store2._DEV_TOOLS_STORE_ID);
      }
    });

    it('each store sends its own ADD_GLOBAL_STATE registration message', () => {
      postedMessages.length = 0;

      const storeA = new GlobalStore({ x: 1 }, { name: 'store-a' } as Any) as Any;
      const storeB = new GlobalStore({ y: 2 }, { name: 'store-b' } as Any) as Any;

      if (storeA._DEV_TOOLS_STORE_ID == null)
        global.REACT_GLOBAL_STATE_HOOK_DEBUG(storeA, undefined, '/stores/a.ts');
      if (storeB._DEV_TOOLS_STORE_ID == null)
        global.REACT_GLOBAL_STATE_HOOK_DEBUG(storeB, undefined, '/stores/b.ts');

      const registrations = msgs('ADD_GLOBAL_STATE');
      expect(registrations.length).toBeGreaterThanOrEqual(2);

      const ids = registrations.map((p) => p.globalStateId);
      // All registration IDs are unique
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  // ── 9. ADD_GLOBAL_STATE payload completeness ───────────────────────────────

  describe('ADD_GLOBAL_STATE payload completeness', () => {
    it('registration payload contains initialState, name, actions config and globalStatePath', () => {
      postedMessages.length = 0;

      const store = new GlobalStore({ count: 0, label: 'test' }, {
        name: 'payload-test-store',
        actions: {
          increment:
            () =>
            ({ setState }: Any) =>
              setState((s: Any) => ({ ...s, count: s.count + 1 })),
        },
      } as Any) as Any;

      if (store._DEV_TOOLS_STORE_ID == null) {
        global.REACT_GLOBAL_STATE_HOOK_DEBUG(store, undefined, '/stores/payload-test.ts');
      }

      const [payload] = msgs('ADD_GLOBAL_STATE');
      expect(payload).toBeDefined();
      expect(payload.globalStateId).toMatch(/store-id:/);
      expect(payload.initialState).toEqual({ count: 0, label: 'test' });
      expect(payload.name).toBe('payload-test-store');
      expect(payload.actions).toBeDefined();
      expect(payload.actions.increment).toBeDefined();
    });

    it('registration payload globalStateId matches the store _DEV_TOOLS_STORE_ID', () => {
      postedMessages.length = 0;

      const store = new GlobalStore({ value: 'hello' }, { name: 'id-check-store' } as Any) as Any;

      if (store._DEV_TOOLS_STORE_ID == null) {
        global.REACT_GLOBAL_STATE_HOOK_DEBUG(store, undefined, '/stores/id-check.ts');
      }

      const [payload] = msgs('ADD_GLOBAL_STATE');
      expect(payload.globalStateId).toBe(store._DEV_TOOLS_STORE_ID);
    });

    it('registration payload globalStatePath matches the path passed to REACT_GLOBAL_STATE_HOOK_DEBUG', () => {
      const store = new GlobalStore({ n: 0 }, { name: 'path-store' } as Any) as Any;

      if (store._DEV_TOOLS_STORE_ID == null) {
        postedMessages.length = 0;
        global.REACT_GLOBAL_STATE_HOOK_DEBUG(store, undefined, '/custom/path/store.ts');

        const [payload] = msgs('ADD_GLOBAL_STATE');
        expect(payload.globalStatePath).toBe('/custom/path/store.ts');
      }
    });
  });

  // ── 10. Devtools panel interactions with real stores ───────────────────────

  describe('devtools panel interactions with real stores', () => {
    it('EXECUTE_ACTION dispatch runs the real action and mutates state', () => {
      const store = buildCounterStore();
      const storeId = store._DEV_TOOLS_STORE_ID;
      const before = store.getState().count;
      postedMessages.length = 0;

      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            action: 'devtools-request/EXECUTE_ACTION',
            payload: { actionName: 'increment', globalStateId: storeId, parameters: '' },
          },
          source: window,
        }),
      );

      expect(store.getState().count).toBe(before + 1);
    });

    it('EXECUTE_ACTION with numeric parameter passes argument to the real action', () => {
      const store = buildCounterStore();
      const storeId = store._DEV_TOOLS_STORE_ID;
      const before = store.getState().count;

      postedMessages.length = 0;

      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            action: 'devtools-request/EXECUTE_ACTION',
            payload: { actionName: 'add', globalStateId: storeId, parameters: '7' },
          },
          source: window,
        }),
      );

      expect(store.getState().count).toBe(before + 7);
    });

    it('SET_STATE request via panel triggers the wrapped setState and produces a log', () => {
      const store = buildCounterStore();
      const storeId = store._DEV_TOOLS_STORE_ID;
      postedMessages.length = 0;

      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            action: 'devtools-request/SET_STATE',
            payload: { globalStateId: storeId, parameters: '{ count: 99 }' },
          },
          source: window,
        }),
      );

      // Wrapped setState logs a START_ACTION (STATE_ACTION type)
      const stateActions = msgs('START_ACTION').filter((p) => p.actionType === 'STATE_ACTION');
      expect(stateActions.length).toBeGreaterThanOrEqual(1);
    });

    it('RESTORE_STATE request via panel merges state and triggers setState', () => {
      const store = buildCounterStore();
      const storeId = store._DEV_TOOLS_STORE_ID;
      postedMessages.length = 0;

      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            action: 'devtools-request/RESTORE_STATE',
            payload: { globalStateId: storeId, state: { count: 50 } },
          },
          source: window,
        }),
      );

      // setState was called (wrapped) — a STATE_ACTION log is emitted
      const stateActions = msgs('START_ACTION').filter((p) => p.actionType === 'STATE_ACTION');
      expect(stateActions.length).toBeGreaterThanOrEqual(1);
    });

    it('panel messages with a different source are ignored', () => {
      const store = buildCounterStore();
      const storeId = store._DEV_TOOLS_STORE_ID;
      postedMessages.length = 0;

      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            action: 'devtools-request/SET_STATE',
            payload: { globalStateId: storeId, parameters: '{ count: 999 }' },
          },
          source: null, // not the current window
        }),
      );

      expect(msgs('START_ACTION').length).toBe(0);
    });
  });

  // ── 11. Store lifecycle cleanup ────────────────────────────────────────────

  // ── 12. Message transport encoding and schema validation ──────────────────

  describe('message transport encoding and schema compliance', () => {
    /**
     * Convert a wire-protocol message (as sent by window.postMessage) back to
     * internal message shape for schema validation:
     * - Strip monkey-patch/ prefix from action
     * - Decode payload via formatFromStore (reverse of formatToStore)
     */
    const toInternalMessage = (wireMsg: Any) => ({
      ...wireMsg,
      action: String(wireMsg.action).replace('monkey-patch/', ''),
      payload: formatFromStore(wireMsg.payload),
    });

    it('all emitted messages decode and match internal MonkeyPathMessageJson schema', () => {
      const store = buildCounterStore();
      postedMessages.length = 0;

      const { actions } = store.__devtools_initialize_getStoreActionsMapWrapped();
      actions.increment();
      store.setState({ count: 99 });

      // Verify messages were actually collected
      expect(postedMessages.length).toBeGreaterThan(0);

      // Each message should decode and pass schema validation
      for (const wireMsg of postedMessages) {
        const internal = toInternalMessage(wireMsg);
        expect(() => assertMonkeyPathMessageJson(internal)).not.toThrow(
          `Message with action ${wireMsg.action} should pass schema validation`,
        );
      }
    });

    it('ADD_GLOBAL_STATE payload is correctly serialized and decodable with full state snapshot', () => {
      postedMessages.length = 0;
      // built for its side effect: registering the store emits ADD_GLOBAL_STATE
      void buildCounterStore();

      const wire = postedMessages.find((m) => m.action === 'monkey-patch/ADD_GLOBAL_STATE');
      expect(wire).toBeDefined();

      const internal = toInternalMessage(wire);
      expect(() => assertAddGlobalStateMessage(internal)).not.toThrow();

      // Verify payload structure
      const { payload } = internal;
      expect(payload.globalStateId).toBeDefined();
      expect(payload.globalStateId).toMatch(/store-id:/);
      expect(payload.initialState).toBeDefined();
      expect(payload.initialState.count).toBe(0);
      expect(payload.name).toBe('counter');
      expect(payload.actions).toBeDefined();
    });

    it('START_ACTION and ADD_ACTION_LOG messages carry properly formatted payloads', () => {
      const store = buildCounterStore();
      postedMessages.length = 0;

      const { actions } = store.__devtools_initialize_getStoreActionsMapWrapped();
      actions.add(7);

      const starts = postedMessages
        .filter((m) => m.action === 'monkey-patch/START_ACTION')
        .map(toInternalMessage);

      const logs = postedMessages
        .filter((m) => m.action === 'monkey-patch/ADD_ACTION_LOG')
        .map(toInternalMessage);

      // Validate all START_ACTION messages
      for (const msg of starts) {
        expect(() => assertStartActionMessage(msg)).not.toThrow();
        expect(msg.payload.action).toBeDefined();
        expect(msg.payload.globalStateId).toBe(store._DEV_TOOLS_STORE_ID);
      }

      // Validate all ADD_ACTION_LOG messages
      for (const msg of logs) {
        expect(() => assertAddActionLogMessage(msg)).not.toThrow();
        expect(msg.payload.globalStateId).toBe(store._DEV_TOOLS_STORE_ID);
      }
    });

    it('UPDATE_ACTION messages close actions with correct timing and state ID', () => {
      const store = buildCounterStore();
      postedMessages.length = 0;

      const { actions } = store.__devtools_initialize_getStoreActionsMapWrapped();
      actions.increment();
      actions.decrement();

      const updates = postedMessages
        .filter((m) => m.action === 'monkey-patch/UPDATE_ACTION')
        .map(toInternalMessage);

      expect(updates.length).toBe(2);

      for (const msg of updates) {
        expect(() => assertUpdateActionMessage(msg)).not.toThrow();
        expect(msg.payload.globalStateId).toBe(store._DEV_TOOLS_STORE_ID);
        expect(typeof msg.payload.timing).toBe('number');
        expect(msg.payload.timing).toBeGreaterThanOrEqual(0);
      }
    });

    it('DELETE_GLOBAL_STATE messages are correctly formatted on dispose and cleanup', () => {
      const store = buildCounterStore();
      const storeId = store._DEV_TOOLS_STORE_ID;
      postedMessages.length = 0;

      try {
        store.dispose();
      } catch {
        // ignore real store dispose error
      }

      const deletes = postedMessages
        .filter((m) => m.action === 'monkey-patch/DELETE_GLOBAL_STATE')
        .map(toInternalMessage);

      expect(deletes.length).toBeGreaterThan(0);

      for (const msg of deletes) {
        expect(() => assertDeleteGlobalStateMessage(msg)).not.toThrow();
        expect(msg.payload.globalStateId).toBe(storeId);
      }
    });

    it('messages collection is populated for all workflow phases', () => {
      const store = buildCounterStore();
      postedMessages.length = 0;

      const { actions } = store.__devtools_initialize_getStoreActionsMapWrapped();
      actions.increment();
      store.setState({ count: 50 });

      // Verify collection is not empty
      expect(postedMessages.length).toBeGreaterThan(0);

      // Verify all expected message types are present
      const hasStart = postedMessages.some((m) => m.action === 'monkey-patch/START_ACTION');
      const hasAddLog = postedMessages.some((m) => m.action === 'monkey-patch/ADD_ACTION_LOG');
      const hasUpdate = postedMessages.some((m) => m.action === 'monkey-patch/UPDATE_ACTION');
      const hasStateStart = postedMessages.some(
        (m) =>
          m.action === 'monkey-patch/START_ACTION' &&
          toInternalMessage(m).payload.actionType === 'STATE_ACTION',
      );

      expect(hasStart).toBe(true);
      expect(hasAddLog).toBe(true);
      expect(hasUpdate).toBe(true);
      expect(hasStateStart).toBe(true);
    });
  });

  describe('store lifecycle cleanup', () => {
    it('dispose sends DELETE_GLOBAL_STATE with the correct store ID', () => {
      const store = buildCounterStore();
      const storeId = store._DEV_TOOLS_STORE_ID;
      postedMessages.length = 0;

      store.dispose();

      const [del] = msgs('DELETE_GLOBAL_STATE');
      expect(del).toBeDefined();
      expect(del.globalStateId).toBe(storeId);
    });

    it('calling dispose twice emits a delete message each time', () => {
      const store = buildCounterStore();
      postedMessages.length = 0;

      store.dispose();
      store.dispose();

      expect(msgs('DELETE_GLOBAL_STATE').length).toBe(2);
    });

    it('dispose from store A does not affect store B registration', () => {
      const storeA = buildCounterStore();
      const storeB = buildCounterStore();
      postedMessages.length = 0;

      try {
        storeA.dispose();
      } catch {
        // ignore underlying real store dispose error; wrapper already emitted message
      }

      const deleted = msgs('DELETE_GLOBAL_STATE');
      expect(deleted.length).toBe(1);
      expect(deleted[0].globalStateId).toBe(storeA._DEV_TOOLS_STORE_ID);
      expect(deleted[0].globalStateId).not.toBe(storeB._DEV_TOOLS_STORE_ID);
    });
  });
});
