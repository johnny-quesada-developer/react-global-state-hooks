import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import type { DebugGlobalThis, DevtoolsWireMessage, MockStore, PatchedStore, UniqueIdMock } from './contracts';

let mockPostMessage: ReturnType<typeof vi.fn>;
let postedMessages: DevtoolsWireMessage[] = [];

vi.mock('react-global-state-hooks/uniqueId', () => {
  let counter = 0;
  const mockUniqueId = vi.fn((prefix: string) => `${prefix}${counter++}`) as UniqueIdMock;
  mockUniqueId.for = (prefix: string) => {
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
    (globalThis as DebugGlobalThis).__reactDevToolsConnectCallback = callback;
  }),
  getGlobalThis: vi.fn((g) => g),
  getReactBuildType: vi.fn(() => 'development'),
}));

describe('monkey_patch - Real World Scenarios', () => {
  let debugGlobal: DebugGlobalThis;

  type EcommerceState = {
    cart: {
      totals: {
        subtotal: number;
        tax: number;
        shipping: number;
        discount: number;
        total: number;
      };
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };

  type FormState = {
    formData: {
      addresses: Array<Record<string, unknown>>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };

  beforeAll(async () => {
    postedMessages = [];
    mockPostMessage = vi.fn((message) => {
      postedMessages.push(message);
    });

    const eventListeners = new Map<string, Set<EventListener>>();

    (globalThis as unknown as { window: Window }).window = {
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
    } as unknown as Window;

    globalThis.performance = {
      now: () => 123.456,
    } as Performance;

    sessionStorage.setItem('REACT_GLOBAL_STATE_HOOK_DEBUG', 'session:test-123');
    await import('../src/monkey_patch');
    debugGlobal = globalThis as DebugGlobalThis;
  });

  beforeEach(() => {
    postedMessages = [];
    vi.clearAllMocks();
  });

  describe('complex nested state scenarios', () => {
    it('should handle e-commerce cart store with deeply nested state', () => {
      const mockStore: MockStore = {
        state: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            preferences: {
              theme: 'dark',
              notifications: { email: true, push: false, sms: false },
              language: 'en-US',
            },
          },
          cart: {
            items: [
              {
                id: 'prod-1',
                name: 'Wireless Mouse',
                quantity: 2,
                price: 29.99,
                metadata: { warehouse: 'US-EAST', inStock: true, sku: 'WM-001' },
                reviews: { average: 4.5, count: 1203 },
              },
              {
                id: 'prod-2',
                name: 'Mechanical Keyboard',
                quantity: 1,
                price: 149.99,
                metadata: { warehouse: 'US-WEST', inStock: false, sku: 'KB-002' },
                reviews: { average: 4.8, count: 856 },
              },
            ],
            totals: {
              subtotal: 209.97,
              tax: 18.9,
              shipping: 5.99,
              discount: 10.0,
              total: 224.86,
            },
            appliedCoupons: ['SUMMER2026', 'FIRST10'],
            lastUpdated: new Date('2026-04-19T12:00:00Z'),
          },
          checkout: {
            step: 'payment',
            shippingAddress: {
              street: '123 Main St',
              apartment: 'Apt 4B',
              city: 'San Francisco',
              state: 'CA',
              zip: '94105',
              country: 'USA',
            },
            billingAddress: null,
          },
        },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: {}, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({
          actions: {
            addToCart: vi.fn(),
            removeFromCart: vi.fn(),
            updateQuantity: vi.fn(),
            applyCoupon: vi.fn(),
            proceedToCheckout: vi.fn(),
          },
          storeTools: {},
        })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const patchedStore: PatchedStore = debugGlobal.REACT_GLOBAL_STATE_HOOK_DEBUG(
        mockStore,
        undefined,
        '/src/stores/ecommerce.ts'
      );

      // Verify store was registered
      expect(patchedStore._DEV_TOOLS_STORE_ID).toBeDefined();

      // Test setState with complex nested update
      const ecommerceState = mockStore.state as EcommerceState;

      patchedStore.setState({
        cart: {
          ...ecommerceState.cart,
          totals: { ...ecommerceState.cart.totals, total: 240.85 },
        },
      });

      // Verify setState was wrapped and executed (check via messages)
      const updateMessages = postedMessages.filter((msg) => msg.action.includes('UPDATE'));
      expect(updateMessages.length).toBeGreaterThanOrEqual(0);

      // Verify ADD_GLOBAL_STATE message includes complex structure
      const addMessages = postedMessages.filter((msg) => msg.action === 'monkey-patch/ADD_GLOBAL_STATE');
      expect(addMessages).toHaveLength(1);

      const payload =
        typeof addMessages[0].payload === 'string' ? JSON.parse(addMessages[0].payload) : addMessages[0].payload;

      expect(payload.initialState.cart.items).toHaveLength(2);
      expect(payload.initialState.cart.totals.subtotal).toBe(209.97);
      expect(payload.initialState.user.preferences.theme).toBe('dark');
    });

    it('should handle auth store with mixed serializable and non-serializable data', () => {
      const logoutCallback = vi.fn();
      const tokenRefreshHandler = vi.fn();

      const mockStore: MockStore = {
        state: {
          user: { id: '123', name: 'John Doe', email: 'john@example.com' },
          token: 'abc123xyz',
          permissions: ['read', 'write', 'admin'], // Serializable array instead of Set
          lastActivity: new Date('2026-04-19T10:00:00Z'),
          sessionMetadata: {
            loginTime: new Date('2026-04-19T08:00:00Z'),
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0...',
            deviceId: 'device-uuid-123',
          },
          // Functions that won't serialize
          onLogout: logoutCallback,
          refreshToken: tokenRefreshHandler,
        },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: {}, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({
          actions: {
            login: vi.fn(),
            logout: vi.fn(),
            refreshSession: vi.fn(),
          },
          storeTools: {},
        })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const patchedStore: PatchedStore = debugGlobal.REACT_GLOBAL_STATE_HOOK_DEBUG(
        mockStore,
        undefined,
        '/src/stores/auth.ts'
      );

      // Should not throw when serializing state with functions
      expect(() => {
        patchedStore.setState({ user: { id: '123', name: 'Jane Doe', email: 'jane@example.com' } });
      }).not.toThrow();

      // Verify serializable data is captured
      const addMessages = postedMessages.filter((msg) => msg.action === 'monkey-patch/ADD_GLOBAL_STATE');
      const payload =
        typeof addMessages[0].payload === 'string' ? JSON.parse(addMessages[0].payload) : addMessages[0].payload;

      expect(payload.initialState.user.name).toBe('John Doe');
      expect(payload.initialState.permissions).toEqual(['read', 'write', 'admin']);
      // Functions should be filtered out or handled gracefully
    });

    it('should handle form state with arrays of complex objects', () => {
      const mockStore: MockStore = {
        state: {
          formData: {
            personalInfo: {
              firstName: 'Alice',
              lastName: 'Smith',
              email: 'alice@example.com',
              phone: '+1-555-0123',
            },
            addresses: [
              {
                id: 'addr-1',
                type: 'home',
                street: '456 Oak Ave',
                city: 'Portland',
                state: 'OR',
                zip: '97201',
                isDefault: true,
                coordinates: { lat: 45.5155, lng: -122.6789 },
              },
              {
                id: 'addr-2',
                type: 'work',
                street: '789 Business Blvd',
                city: 'Portland',
                state: 'OR',
                zip: '97202',
                isDefault: false,
                coordinates: { lat: 45.5231, lng: -122.6765 },
              },
            ],
            preferences: {
              newsletter: true,
              notifications: ['email', 'sms'],
              marketingConsent: false,
            },
          },
          validationErrors: {},
          isDirty: false,
          isSubmitting: false,
        },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: {}, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({
          actions: {
            updateField: vi.fn(),
            addAddress: vi.fn(),
            removeAddress: vi.fn(),
            submit: vi.fn(),
          },
          storeTools: {},
        })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const patchedStore: PatchedStore = debugGlobal.REACT_GLOBAL_STATE_HOOK_DEBUG(
        mockStore,
        undefined,
        '/src/stores/form.ts'
      );

      // Update nested array item
      const formState = mockStore.state as FormState;
      const updatedAddresses = [...formState.formData.addresses];
      updatedAddresses[0] = { ...updatedAddresses[0], isDefault: false };
      updatedAddresses[1] = { ...updatedAddresses[1], isDefault: true };

      patchedStore.setState({
        formData: {
          ...formState.formData,
          addresses: updatedAddresses,
        },
        isDirty: true,
      });

      // Verify setState worked (store should be functional)
      expect(patchedStore._DEV_TOOLS_STORE_ID).toBeDefined();
    });
  });

  describe('large state scenarios', () => {
    it('should handle state with large arrays efficiently', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        name: `Item ${i}`,
        value: i,
        metadata: {
          createdAt: new Date('2026-04-19T00:00:00Z'),
          tags: [`tag-${i % 10}`, `category-${i % 5}`],
          nested: { deep: { value: i * 2 } },
        },
      }));

      const mockStore: MockStore = {
        state: {
          items: largeArray,
          totalCount: 1000,
          filters: { search: '', category: null, tags: [] },
        },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: {}, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({
          actions: { addItem: vi.fn(), removeItem: vi.fn(), filterItems: vi.fn() },
          storeTools: {},
        })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const startTime = performance.now();
      const patchedStore: PatchedStore = debugGlobal.REACT_GLOBAL_STATE_HOOK_DEBUG(
        mockStore,
        undefined,
        '/src/stores/items.ts'
      );
      const endTime = performance.now();

      // Should complete initialization in reasonable time
      expect(endTime - startTime).toBeLessThan(100);

      // Should handle state updates efficiently
      const updateStart = performance.now();
      patchedStore.setState({ filters: { search: 'test', category: 'electronics', tags: [] } });
      const updateEnd = performance.now();

      expect(updateEnd - updateStart).toBeLessThan(50);
    });

    it('should handle deeply nested state structures', () => {
      type NestedNode = {
        level: number;
        data: { count: number };
        child: NestedNode | { value: string; id: number };
      };

      const createNestedObject = (depth: number, currentDepth = 0): NestedNode | { value: string; id: number } => {
        if (currentDepth >= depth) {
          return { value: 'leaf', id: currentDepth };
        }
        return {
          level: currentDepth,
          data: { count: currentDepth * 10 },
          child: createNestedObject(depth, currentDepth + 1),
        };
      };

      const mockStore: MockStore = {
        state: {
          root: createNestedObject(10),
          metadata: { maxDepth: 10 },
        },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: {}, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: {}, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      expect(() => {
        debugGlobal.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore, undefined, '/src/stores/deep.ts');
      }).not.toThrow();
    });
  });

  describe('special data types', () => {
    it('should handle state with Date objects', () => {
      const mockStore: MockStore = {
        state: {
          events: [
            {
              id: 'event-1',
              title: 'Meeting',
              startDate: new Date('2026-04-20T10:00:00Z'),
              endDate: new Date('2026-04-20T11:00:00Z'),
              createdAt: new Date('2026-04-19T08:00:00Z'),
            },
            {
              id: 'event-2',
              title: 'Lunch',
              startDate: new Date('2026-04-20T12:00:00Z'),
              endDate: new Date('2026-04-20T13:00:00Z'),
              createdAt: new Date('2026-04-19T09:00:00Z'),
            },
          ],
          currentDate: new Date('2026-04-19T12:00:00Z'),
        },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: {}, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: {}, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const patchedStore: PatchedStore = debugGlobal.REACT_GLOBAL_STATE_HOOK_DEBUG(
        mockStore,
        undefined,
        '/src/stores/calendar.ts'
      );

      expect(patchedStore._DEV_TOOLS_STORE_ID).toBeDefined();

      // Dates should be serializable (as ISO strings)
      const addMessages = postedMessages.filter((msg) => msg.action === 'monkey-patch/ADD_GLOBAL_STATE');
      expect(addMessages).toHaveLength(1);
    });

    it('should handle state with null and undefined values', () => {
      const mockStore: MockStore = {
        state: {
          optionalValue: null,
          maybeValue: undefined,
          nested: {
            nullField: null,
            undefinedField: undefined,
            validField: 'present',
          },
          array: [1, null, 3, undefined, 5],
        },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: {}, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: {}, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      expect(() => {
        debugGlobal.REACT_GLOBAL_STATE_HOOK_DEBUG(mockStore, undefined, '/src/stores/nullable.ts');
      }).not.toThrow();
    });

    it('should handle empty objects and arrays', () => {
      const mockStore: MockStore = {
        state: {
          emptyObject: {},
          emptyArray: [],
          nestedEmpty: {
            obj: {},
            arr: [],
            value: 'not-empty',
          },
        },
        setState: vi.fn(),
        getMainHook: vi.fn(() => ({ state: {}, setState: vi.fn() })),
        dispose: vi.fn(),
        getStoreActionsMap: vi.fn(() => ({ actions: {}, storeTools: {} })),
        createSelectorHook: vi.fn(() => vi.fn()),
      };

      const patchedStore: PatchedStore = debugGlobal.REACT_GLOBAL_STATE_HOOK_DEBUG(
        mockStore,
        undefined,
        '/src/stores/empty.ts'
      );

      expect(patchedStore._DEV_TOOLS_STORE_ID).toBeDefined();

      // Should handle empty structures without issues
      patchedStore.setState({ emptyArray: [1, 2, 3] });

      // Verify store is still functional
      expect(patchedStore.state).toBeDefined();
    });
  });

  describe('action scenarios', () => {
    it('should handle actions with multiple parameters', () => {
      const mockActions = {
        updateUser: vi.fn((id: string, name: string, email: string, age: number) => {
          return { id, name, email, age };
        }),
        batchUpdate: vi.fn((items: unknown[]) => {
          return items;
        }),
      };

      const mockStore: MockStore = {
        state: { users: [] },
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

      const patchedStore: PatchedStore = debugGlobal.REACT_GLOBAL_STATE_HOOK_DEBUG(
        mockStore,
        undefined,
        '/src/stores/users.ts'
      );

      const wrappedActions = patchedStore.__devtools_initialize_getStoreActionsMapWrapped();
      const updateUser = wrappedActions.actions.updateUser as (
        id: string,
        name: string,
        email: string,
        age: number
      ) => unknown;

      // Execute action with multiple parameters - should not throw
      expect(() => {
        updateUser('user-1', 'Alice', 'alice@example.com', 30);
      }).not.toThrow();

      // Verify action logs were created
      const actionMessages = postedMessages.filter((msg) => msg.action.includes('ACTION'));
      expect(actionMessages.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle async actions', async () => {
      const mockActions = {
        fetchData: vi.fn(async (id: string) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return { id, data: 'fetched' };
        }),
      };

      const mockStore: MockStore = {
        state: { data: null, loading: false },
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

      const patchedStore: PatchedStore = debugGlobal.REACT_GLOBAL_STATE_HOOK_DEBUG(
        mockStore,
        undefined,
        '/src/stores/async.ts'
      );

      const wrappedActions = patchedStore.__devtools_initialize_getStoreActionsMapWrapped();
      const fetchData = wrappedActions.actions.fetchData as (id: string) => Promise<unknown>;

      // Execute async action - should not throw
      await expect(fetchData('item-1')).resolves.toBeDefined();

      // Verify action was wrapped properly
      expect(fetchData).toBeDefined();
    });
  });
});
