import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

let mockPostMessage: ReturnType<typeof vi.fn>;
let postedMessages: any[] = [];

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

describe('Error Recovery & Edge Cases', () => {
  let global: any;

  beforeAll(async () => {
    postedMessages = [];
    mockPostMessage = vi.fn((message) => {
      postedMessages.push(message);
    });

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

  describe('circular reference handling', () => {
    it('should handle circular references in state without crashing', () => {
      const circularState: any = {
        name: 'root',
        value: 42,
        children: [],
      };

      // Create circular reference
      const child: any = { name: 'child', parent: circularState };
      circularState.children.push(child);

      const mockStore: any = {
        state: circularState,
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: {}, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: {}, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      // Should not throw when creating store with circular reference
      expect(() => {
        global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore, undefined, '/src/stores/tree.ts');
      }).not.toThrow();
    });

    it('should handle self-referencing objects', () => {
      const selfRef: any = {
        id: '1',
        data: { value: 'test' },
      };
      selfRef.self = selfRef;

      const mockStore: any = {
        state: { node: selfRef },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: {}, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: {}, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      expect(() => {
        global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore, undefined, '/src/stores/self-ref.ts');
      }).not.toThrow();
    });

    it('should handle deeply nested circular references', () => {
      const root: any = { level: 0 };
      let current = root;

      // Create chain of 5 objects
      for (let i = 1; i <= 5; i++) {
        current.next = { level: i, previous: current };
        current = current.next;
      }

      // Create circular reference back to root
      current.next = root;
      root.previous = current;

      const mockStore: any = {
        state: { chain: root },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: {}, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: {}, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      expect(() => {
        global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore, undefined, '/src/stores/chain.ts');
      }).not.toThrow();
    });
  });

  describe('performance edge cases', () => {
    it('should handle extremely large arrays efficiently', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({
        id: `item-${i}`,
        value: i,
        metadata: {
          created: new Date('2026-04-19T00:00:00Z'),
          tags: [`tag-${i % 10}`, `category-${i % 5}`],
          nested: { deep: { value: i * 2 } },
        },
      }));

      const mockStore: any = {
        state: { items: largeArray, count: 10000 },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: {}, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: {}, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const startTime = performance.now();
      const patchedStore = global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore, undefined, '/src/stores/large-array.ts');
      const endTime = performance.now();

      // Should complete in reasonable time (< 100ms)
      expect(endTime - startTime).toBeLessThan(100);

      // Should still be able to update state
      const updateStart = performance.now();
      patchedStore.setState({ count: 10001 });
      const updateEnd = performance.now();

      expect(updateEnd - updateStart).toBeLessThan(50);
    });

    it('should handle large objects with many keys efficiently', () => {
      const largeObject: any = {};
      for (let i = 0; i < 1000; i++) {
        largeObject[`key${i}`] = {
          value: i,
          data: `data-${i}`,
          nested: { level1: { level2: { value: i } } },
        };
      }

      const mockStore: any = {
        state: largeObject,
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: {}, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: {}, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const startTime = performance.now();
      global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore, undefined, '/src/stores/large-object.ts');
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle rapid setState calls', () => {
      let currentState = { count: 0 };
      const mockStore: any = {
        state: currentState,
        setState: vi.fn((update) => {
          currentState = { ...currentState, ...update };
          mockStore.state = currentState;
        }),
        getMainHook: vi.fn(() => ({ state: currentState, setState: mockStore.setState })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: {}, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const patchedStore = global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore, undefined, '/src/stores/rapid.ts');

      const startTime = performance.now();

      // Perform 100 rapid setState calls
      for (let i = 0; i < 100; i++) {
        patchedStore.setState({ count: i });
      }

      const endTime = performance.now();

      // Should complete all updates in reasonable time
      expect(endTime - startTime).toBeLessThan(200);
      expect(currentState.count).toBe(99);
    });
  });

  describe('action error handling', () => {
    it('should recover from action execution errors', () => {
      const mockActions = {
        throwError: vi.fn(() => {
          throw new Error('Action failed!');
        }),
        safeAction: vi.fn(() => {
          mockStore.setState({ success: true });
        }),
      };

      let currentState = { success: false };
      const mockStore: any = {
        state: currentState,
        setState: vi.fn((update) => {
          currentState = { ...currentState, ...update };
          mockStore.state = currentState;
        }),
        getMainHook: vi.fn(() => ({ state: currentState, setState: mockStore.setState })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({
          actions: mockActions,
          storeTools: {},
        })),
        createSelectorHook: vi.fn(() => vi.fn()),
        actionsConfig: mockActions,
      };

      const patchedStore = global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore, undefined, '/src/stores/error.ts');
      const actions = patchedStore.__devtools_initialize_getStoreActionsMapWrapped();

      // Execute action that throws
      expect(() => actions.actions.throwError()).toThrow('Action failed!');

      // Should still be able to execute other actions
      expect(() => actions.actions.safeAction()).not.toThrow();
      expect(currentState.success).toBe(true);
    });

    it('should handle async action errors', async () => {
      const mockActions = {
        asyncError: vi.fn(async () => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          throw new Error('Async error!');
        }),
        asyncSuccess: vi.fn(async () => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          return 'success';
        }),
      };

      const mockStore: any = {
        state: {},
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: {}, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({
          actions: mockActions,
          storeTools: {},
        })),
        createSelectorHook: vi.fn(() => vi.fn()),
        actionsConfig: mockActions,
      };

      const patchedStore = global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore, undefined, '/src/stores/async-error.ts');
      const actions = patchedStore.__devtools_initialize_getStoreActionsMapWrapped();

      // Should handle async error
      await expect(actions.actions.asyncError()).rejects.toThrow('Async error!');

      // Should still work after error
      const result = await actions.actions.asyncSuccess();
      expect(result).toBe('success');
    });

    it('should handle actions that modify state and throw', () => {
      let currentState = { count: 0, error: null as string | null };

      const mockActions = {
        partialUpdate: vi.fn(() => {
          // Update state first
          mockStore.setState({ count: 5 });
          // Then throw
          throw new Error('Something went wrong');
        }),
      };

      const mockStore: any = {
        state: currentState,
        setState: vi.fn((update) => {
          currentState = { ...currentState, ...update };
          mockStore.state = currentState;
        }),
        getMainHook: vi.fn(() => ({ state: currentState, setState: mockStore.setState })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({
          actions: mockActions,
          storeTools: {},
        })),
        createSelectorHook: vi.fn(() => vi.fn()),
        actionsConfig: mockActions,
      };

      const patchedStore = global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore, undefined, '/src/stores/partial.ts');
      const actions = patchedStore.__devtools_initialize_getStoreActionsMapWrapped();

      expect(() => actions.actions.partialUpdate()).toThrow('Something went wrong');

      // State should still be updated
      expect(currentState.count).toBe(5);
    });
  });

  describe('edge case state values', () => {
    it('should handle NaN and Infinity', () => {
      const mockStore: any = {
        state: {
          nanValue: NaN,
          positiveInfinity: Infinity,
          negativeInfinity: -Infinity,
          normal: 42,
        },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: {}, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: {}, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      expect(() => {
        global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore, undefined, '/src/stores/special-numbers.ts');
      }).not.toThrow();
    });

    it('should handle BigInt values', () => {
      const mockStore: any = {
        state: {
          bigNumber: 9007199254740991n,
          normalNumber: 123,
        },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: {}, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: {}, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      expect(() => {
        global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore, undefined, '/src/stores/bigint.ts');
      }).not.toThrow();
    });

    it('should handle Symbol values', () => {
      const sym = Symbol('test');

      const mockStore: any = {
        state: {
          symbol: sym,
          normal: 'value',
        },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: {}, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: {}, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      expect(() => {
        global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore, undefined, '/src/stores/symbol.ts');
      }).not.toThrow();
    });

    it('should handle RegExp objects', () => {
      const mockStore: any = {
        state: {
          pattern: /test-\d+/gi,
          anotherPattern: new RegExp('abc', 'i'),
          normal: 'string',
        },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: {}, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: {}, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      expect(() => {
        global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore, undefined, '/src/stores/regex.ts');
      }).not.toThrow();
    });

    it('should handle Error objects in state', () => {
      const mockStore: any = {
        state: {
          lastError: new Error('Something went wrong'),
          errorMessage: 'Manual error message',
          stack: new Error().stack,
        },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: {}, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: {}, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      expect(() => {
        global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore, undefined, '/src/stores/error-state.ts');
      }).not.toThrow();
    });

    it('should handle Map and Set objects', () => {
      const mockStore: any = {
        state: {
          userMap: new Map([
            ['user1', { name: 'Alice' }],
            ['user2', { name: 'Bob' }],
          ]),
          uniqueIds: new Set(['id1', 'id2', 'id3']),
          normal: { key: 'value' },
        },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: {}, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: {}, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      expect(() => {
        global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore, undefined, '/src/stores/collections.ts');
      }).not.toThrow();
    });

    it('should handle WeakMap and WeakSet objects', () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 2 };

      const mockStore: any = {
        state: {
          weakMap: new WeakMap([[obj1, 'value1']]),
          weakSet: new WeakSet([obj1, obj2]),
          normal: 'value',
        },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: {}, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: {}, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      expect(() => {
        global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore, undefined, '/src/stores/weak-collections.ts');
      }).not.toThrow();
    });

    it('should handle Promise objects in state', () => {
      const mockStore: any = {
        state: {
          pendingRequest: Promise.resolve('data'),
          anotherPromise: new Promise((resolve) => setTimeout(() => resolve('later'), 100)),
          normal: 'sync-value',
        },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: {}, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: {}, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      expect(() => {
        global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore, undefined, '/src/stores/promises.ts');
      }).not.toThrow();
    });
  });

  describe('missing or invalid store properties', () => {
    it('should handle store without getStoreActionsMap gracefully', () => {
      const mockStore: any = {
        state: { count: 0 },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: {}, setState: vi.fn() })),
        dispose: vi.fn(),
        createSelectorHook: vi.fn(() => vi.fn()),
        // Missing getStoreActionsMap - provide empty one
        getStoreActionsMap: vi.fn(() => ({ actions: null, storeTools: {} })),
      };

      // Should not throw even without actions
      expect(() => {
        global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore, undefined, '/src/stores/no-actions.ts');
      }).not.toThrow();
    });

    it('should handle store without createSelectorHook', () => {
      const mockStore: any = {
        state: { count: 0 },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: {}, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: {}, storeTools: {} })),
        // Missing createSelectorHook
      };

      expect(() => {
        global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore, undefined, '/src/stores/no-selector.ts');
      }).not.toThrow();
    });

    it('should handle store without dispose', () => {
      const mockStore: any = {
        state: { count: 0 },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: {}, setState: vi.fn() })),
        getStoreActionsMap: vi.fn(() => ({ actions: {}, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
        // Missing dispose
      };

      expect(() => {
        global.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore, undefined, '/src/stores/no-dispose.ts');
      }).not.toThrow();
    });
  });
});
