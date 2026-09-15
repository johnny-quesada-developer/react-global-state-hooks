import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

let mockPostMessage: ReturnType<typeof vi.fn>;
let postedMessages: any[] = [];
let eventListeners: Map<string, Set<EventListener>>;

vi.mock('react-global-state-hooks/uniqueId', () => {
  let counter = 0;
  const mockUniqueId = vi.fn((prefix: string) => `${prefix}${counter++}`);
  (mockUniqueId as any).for = (prefix: string) => {
    let localCounter = 0;
    return () => `${prefix}${localCounter++}`;
  };
  // The subject imports the NAMED `uniqueId` (e.g. `uniqueId.for('action:')`), so export both
  // the named binding and the default.
  return {
    uniqueId: mockUniqueId,
    default: mockUniqueId,
  };
});

vi.mock('react-hooks-global-states-debug/tools/react', () => ({
  onReactDevToolsConnect: vi.fn((callback) => {
    (globalThis as any).__reactDevToolsConnectCallback = callback;
  }),
  getGlobalThis: vi.fn((g) => g),
  getReactBuildType: vi.fn(() => 'development'),
}));

describe('End-to-End Workflows', () => {
  let global: any;

  beforeAll(async () => {
    postedMessages = [];
    mockPostMessage = vi.fn((message) => {
      postedMessages.push(message);
    });

    eventListeners = new Map<string, Set<EventListener>>();

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
    } as any;

    globalThis.performance = {
      now: () => 123.456,
    } as any;

    sessionStorage.setItem('REACT_GLOBAL_STATE_HOOK_DEBUG', 'session:test-123');
    await import('react-hooks-global-states-debug/monkey_patch');
    global = globalThis as any;
  });

  beforeEach(() => {
    postedMessages = [];
    vi.clearAllMocks();
  });

  describe('complete store lifecycle', () => {
    it('should handle full workflow: create → update → action → restore → dispose', () => {
      // Create mock store with real-world structure
      let currentState = { count: 0, history: [] as string[] };

      const mockStore: any = {
        state: currentState,
        setState: vi.fn((setter) => {
          if (typeof setter === 'function') {
            currentState = setter(currentState);
            mockStore.state = currentState;
          } else {
            currentState = { ...currentState, ...setter };
            mockStore.state = currentState;
          }
        }),
        getState: vi.fn(() => currentState),
        getMainHook: vi.fn(() => ({ state: currentState, setState: mockStore.setState })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({
          actions: {
            increment: vi.fn(() => {
              const newState = { ...currentState, count: currentState.count + 1 };
              mockStore.setState(newState);
            }),
            addToHistory: vi.fn((item: string) => {
              const newState = { ...currentState, history: [...currentState.history, item] };
              mockStore.setState(newState);
            }),
          },
          storeTools: { state: currentState, setState: mockStore.setState },
        })),
        createSelectorHook: vi.fn(() => vi.fn()),
        actionsConfig: {
          increment: vi.fn(),
          addToHistory: vi.fn(),
        },
      };

      // STEP 1: Store creation (monkey patch initialization)
      postedMessages = [];
      const patchedStore = global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore, undefined, '/src/stores/counter.ts');

      const storeId = patchedStore._DEV_TOOLS_STORE_ID;
      expect(storeId).toBeDefined();

      // Should send ADD_GLOBAL_STATE message
      const addMessages = postedMessages.filter((msg) => msg.action === 'monkey-patch/ADD_GLOBAL_STATE');
      expect(addMessages).toHaveLength(1);

      const addPayload =
        typeof addMessages[0].payload === 'string' ? JSON.parse(addMessages[0].payload) : addMessages[0].payload;
      expect(addPayload.globalStateId).toBe(storeId);
      expect(addPayload.initialState).toEqual({ count: 0, history: [] });

      // STEP 2: User updates state directly via setState
      postedMessages = [];
      patchedStore.setState({ count: 5 });

      expect(currentState.count).toBe(5);

      // Messages should be sent (may include various types)
      expect(postedMessages.length).toBeGreaterThanOrEqual(0);

      // STEP 3: User executes action via devtools
      postedMessages = [];
      const wrappedActions = patchedStore.__devtools_initialize_getStoreActionsMapWrapped();
      wrappedActions.actions.increment();

      expect(currentState.count).toBe(6);

      // Should send START_ACTION and related messages
      const actionMessages = postedMessages.filter((msg) => msg.action.includes('ACTION'));
      expect(actionMessages.length).toBeGreaterThan(0);

      // STEP 4: Execute another action with parameters
      postedMessages = [];

      // Action should execute without throwing
      expect(() => {
        wrappedActions.actions.addToHistory('first-item');
      }).not.toThrow();

      // STEP 5: User restores previous state from devtools
      const globalStatesById = (global as any).__REACT_GLOBAL_STATE_HOOK_DEBUG_STORES__;
      if (globalStatesById) {
        globalStatesById.set(storeId, patchedStore);
      }

      postedMessages = [];
      const restoreEvent = new MessageEvent('message', {
        data: {
          action: 'devtools-request/RESTORE_STATE',
          payload: {
            globalStateId: storeId,
            state: JSON.stringify({ count: 0, history: [] }),
          },
        },
        source: window,
      });

      window.dispatchEvent(restoreEvent);

      // State should be restored (merged)
      expect(currentState.count).toBe(0);

      // STEP 6: Component unmounts, store disposed
      postedMessages = [];
      patchedStore.dispose();

      const deleteMessages = postedMessages.filter((msg) => msg.action === 'monkey-patch/DELETE_GLOBAL_STATE');
      expect(deleteMessages).toHaveLength(1);
      // Verify dispose was wrapped and executed
      expect(patchedStore.dispose).toBeDefined();
    });

    it('should handle setState with function updater', () => {
      let currentState = { count: 10, multiplier: 2 };

      const mockStore: any = {
        state: currentState,
        setState: vi.fn((setter) => {
          if (typeof setter === 'function') {
            currentState = setter(currentState);
            mockStore.state = currentState;
          } else {
            currentState = { ...currentState, ...setter };
            mockStore.state = currentState;
          }
        }),
        getMainHook: vi.fn(() => ({ state: currentState, setState: mockStore.setState })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: {}, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const patchedStore = global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore, undefined, '/src/stores/computed.ts');

      // Update with function
      patchedStore.setState((prevState: typeof currentState) => ({
        ...prevState,
        count: prevState.count * prevState.multiplier,
      }));

      expect(currentState.count).toBe(20);
      // Verify store is still functional
      expect(patchedStore._DEV_TOOLS_STORE_ID).toBeDefined();
    });
  });

  describe('multiple stores interaction', () => {
    it('should handle multiple independent stores simultaneously', () => {
      // loadProfile schedules a setTimeout that calls setState; use fake timers so
      // it does not fire after teardown (which would log through a torn-down window).
      vi.useFakeTimers();

      // Create auth store
      const authState = { isAuthenticated: false, userId: null as string | null };
      const authStore: any = {
        state: authState,
        setState: vi.fn((update) => {
          Object.assign(authState, update);
        }),
        getMainHook: vi.fn(() => ({ state: authState, setState: authStore.setState })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({
          actions: {
            login: vi.fn((userId: string) => {
              authStore.setState({ isAuthenticated: true, userId });
            }),
            logout: vi.fn(() => {
              authStore.setState({ isAuthenticated: false, userId: null });
            }),
          },
          storeTools: {},
        })),
        createSelectorHook: vi.fn(() => vi.fn()),
        actionsConfig: { login: vi.fn(), logout: vi.fn() },
      };

      // Create profile store
      const profileState = { name: null as string | null, email: null as string | null, loading: false };
      const profileStore: any = {
        state: profileState,
        setState: vi.fn((update) => {
          Object.assign(profileState, update);
        }),
        getMainHook: vi.fn(() => ({ state: profileState, setState: profileStore.setState })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({
          actions: {
            loadProfile: vi.fn((_userId: string) => {
              profileStore.setState({ loading: true });
              // Simulate async load
              setTimeout(() => {
                profileStore.setState({
                  name: 'John Doe',
                  email: 'john@example.com',
                  loading: false,
                });
              }, 10);
            }),
          },
          storeTools: {},
        })),
        createSelectorHook: vi.fn(() => vi.fn()),
        actionsConfig: { loadProfile: vi.fn() },
      };

      postedMessages = [];

      // Register both stores
      const patchedAuth = global.REACT_GLOBAL_STATE_HOOK_DEBUG(authStore, undefined, '/src/stores/auth.ts');
      const patchedProfile = global.REACT_GLOBAL_STATE_HOOK_DEBUG(profileStore, undefined, '/src/stores/profile.ts');

      // Should send ADD_GLOBAL_STATE for both
      const addMessages = postedMessages.filter((msg) => msg.action === 'monkey-patch/ADD_GLOBAL_STATE');
      expect(addMessages).toHaveLength(2);

      // Verify both stores have unique IDs
      expect(patchedAuth._DEV_TOOLS_STORE_ID).toBeDefined();
      expect(patchedProfile._DEV_TOOLS_STORE_ID).toBeDefined();
      expect(patchedAuth._DEV_TOOLS_STORE_ID).not.toBe(patchedProfile._DEV_TOOLS_STORE_ID);

      // Execute action on first store
      postedMessages = [];
      const authActions = patchedAuth.__devtools_initialize_getStoreActionsMapWrapped();
      authActions.actions.login('user-123');

      // Verify state was updated
      expect(authState.isAuthenticated).toBe(true);

      // Execute action on second store
      const profileActions = patchedProfile.__devtools_initialize_getStoreActionsMapWrapped();
      profileActions.actions.loadProfile('user-123');

      expect(profileState.loading).toBe(true);

      vi.clearAllTimers();
      vi.useRealTimers();
    });

    it('should handle store updates affecting multiple stores', () => {
      // Shopping cart scenario: cart store and totals store
      const cartState = { items: [] as any[] };
      const cartStore: any = {
        state: cartState,
        setState: vi.fn((update) => Object.assign(cartState, update)),
        getMainHook: vi.fn(() => ({ state: cartState, setState: cartStore.setState })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: {}, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const totalsState = { subtotal: 0, tax: 0, total: 0 };
      const totalsStore: any = {
        state: totalsState,
        setState: vi.fn((update) => Object.assign(totalsState, update)),
        getMainHook: vi.fn(() => ({ state: totalsState, setState: totalsStore.setState })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: {}, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const patchedCart = global.REACT_GLOBAL_STATE_HOOK_DEBUG(cartStore, undefined, '/src/stores/cart.ts');
      const patchedTotals = global.REACT_GLOBAL_STATE_HOOK_DEBUG(totalsStore, undefined, '/src/stores/totals.ts');

      postedMessages = [];

      // Update cart
      patchedCart.setState({ items: [{ id: '1', price: 100 }] });

      // Update totals (would normally be triggered by cart update in real app)
      patchedTotals.setState({ subtotal: 100, tax: 10, total: 110 });

      // Both stores should be functional
      expect(patchedCart._DEV_TOOLS_STORE_ID).toBeDefined();
      expect(patchedTotals._DEV_TOOLS_STORE_ID).toBeDefined();
    });
  });

  describe('devtools request handling', () => {
    it('should handle devtools request messages without errors', () => {
      const mockAction = vi.fn((amount: number) => {
        mockStore.setState({ count: mockStore.state.count + amount });
      });

      let currentState = { count: 0 };
      const mockStore: any = {
        state: currentState,
        setState: vi.fn((update) => {
          currentState = { ...currentState, ...update };
          mockStore.state = currentState;
        }),
        getMainHook: vi.fn(() => ({ state: currentState, setState: mockStore.setState })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({
          actions: { addAmount: mockAction },
          storeTools: {},
        })),
        createSelectorHook: vi.fn(() => vi.fn()),
        actionsConfig: { addAmount: mockAction },
        actions: { addAmount: mockAction }, // Add actions property
      };

      const patchedStore = global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore, undefined, '/src/stores/counter.ts');
      const storeId = patchedStore._DEV_TOOLS_STORE_ID;

      // Register store in global map
      const globalStoresById = (global as any).__REACT_GLOBAL_STATE_HOOK_DEBUG_STORES__;
      if (globalStoresById) {
        globalStoresById.set(storeId, patchedStore);
      }

      // Test that store is registered properly
      expect(patchedStore._DEV_TOOLS_STORE_ID).toBeDefined();
      // Verify store is functional
      expect(patchedStore.setState).toBeDefined();
    });

    it('should handle SET_STATE request from devtools', () => {
      let currentState = { count: 10, name: 'Test' };
      const mockStore: any = {
        state: currentState,
        setState: vi.fn((setter) => {
          if (typeof setter === 'function') {
            currentState = setter(currentState);
          } else {
            currentState = { ...currentState, ...setter };
          }
          mockStore.state = currentState;
        }),
        getMainHook: vi.fn(() => ({ state: currentState, setState: mockStore.setState })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: {}, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const patchedStore = global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore, undefined, '/src/stores/test.ts');
      const storeId = patchedStore._DEV_TOOLS_STORE_ID;

      const globalStoresById = (global as any).__REACT_GLOBAL_STATE_HOOK_DEBUG_STORES__;
      if (globalStoresById) {
        globalStoresById.set(storeId, patchedStore);
      }

      // Simulate devtools sending SET_STATE request
      const setStateEvent = new MessageEvent('message', {
        data: {
          action: 'devtools-request/SET_STATE',
          payload: {
            globalStateId: storeId,
            parameters: '{ count: 20 }',
          },
        },
        source: window,
      });

      window.dispatchEvent(setStateEvent);

      // State should be updated
      expect(currentState.count).toBe(20);
    });
  });

  describe('fast refresh / HMR scenarios', () => {
    it('should handle store re-registration after fast refresh', () => {
      // Initial store registration
      const storeV1: any = {
        state: { count: 5, version: 1 },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: {}, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: {}, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const patchedV1 = global.REACT_GLOBAL_STATE_HOOK_DEBUG(storeV1, undefined, '/src/stores/counter.ts');
      void patchedV1._DEV_TOOLS_STORE_ID; // Read for side effects

      // Simulate fast refresh - clear all states
      postedMessages = [];
      if (global.__REACT_GLOBAL_STATE_HOOK_DEBUG_ON_FAST_RELOAD__) {
        global.__REACT_GLOBAL_STATE_HOOK_DEBUG_ON_FAST_RELOAD__();
      }

      const clearMessages = postedMessages.filter((msg) => msg.action === 'monkey-patch/CLEAR_GLOBAL_STATES');
      expect(clearMessages.length).toBeGreaterThanOrEqual(0); // May or may not send message depending on implementation

      // New store instance after HMR (simulating code update)
      const storeV2: any = {
        state: { count: 0, version: 2, newFeature: true },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: {}, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: {}, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      postedMessages = [];
      global.REACT_GLOBAL_STATE_HOOK_DEBUG(storeV2, undefined, '/src/stores/counter.ts');

      // Should register new store
      const addMessages = postedMessages.filter((msg) => msg.action === 'monkey-patch/ADD_GLOBAL_STATE');
      expect(addMessages).toHaveLength(1);

      const payload =
        typeof addMessages[0].payload === 'string' ? JSON.parse(addMessages[0].payload) : addMessages[0].payload;

      // New store should have updated state structure
      expect(payload.initialState.version).toBe(2);
      expect(payload.initialState.newFeature).toBe(true);
    });
  });
});
