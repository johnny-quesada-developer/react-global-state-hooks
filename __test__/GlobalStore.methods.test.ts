import GlobalStore from '../src/GlobalStore';
import formatToStore from 'json-storage-formatter/formatToStore';
import formatFromStore from 'json-storage-formatter/formatFromStore';
import type { ItemEnvelope } from '../src/types';

describe('GlobalStore - localStorage specific methods', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('getStorageItem', () => {
    it('should retrieve and parse stored envelope from localStorage', () => {
      const envelope: ItemEnvelope<{ count: number }> = {
        s: { count: 42 },
        v: 1,
      };

      localStorage.setItem('test-key-getitem', formatToStore(envelope));

      const store = new GlobalStore(
        { count: 0 },
        {
          localStorage: {
            key: 'test-key-getitem',
            versioning: {
              version: 1,
              migrator: ({ legacy }) => legacy as { count: number },
            },
          },
        },
      );

      const retrieved = store.getStorageItem();

      expect(retrieved?.s).toEqual({ count: 42 });
      expect(retrieved?.v).toBe(1);
    });

    it('should return null when key does not exist in localStorage', () => {
      // Clear to ensure nothing exists
      localStorage.clear();

      const store = new GlobalStore(0, {
        localStorage: {
          key: 'non-existent-key-unique-12345',
        },
      });

      // Clear what onInit created
      localStorage.removeItem('non-existent-key-unique-12345');

      const retrieved = store.getStorageItem();

      expect(retrieved).toBeNull();
    });

    it('should throw error for invalid envelope format', () => {
      localStorage.setItem('invalid-key-987654', JSON.stringify({ invalid: 'format' }));

      expect(() => {
        new GlobalStore(0, {
          localStorage: {
            key: 'invalid-key-987654',
          },
        });
      }).not.toThrow();

      // The getStorageItem is called internally during onInit and the error is handled
      // So we need to suppress the error handler to test the raw method
      const store = new GlobalStore(0, {
        localStorage: {
          key: 'another-invalid-key',
        },
      });

      localStorage.setItem('another-invalid-key', JSON.stringify({ invalid: 'format' }));

      expect(() => store.getStorageItem()).toThrow();
    });

    it('should handle envelope with version', () => {
      const envelope: ItemEnvelope<number> = {
        s: 100,
        v: 2,
      };

      localStorage.setItem('versioned-key', formatToStore(envelope));

      const store = new GlobalStore(0, {
        localStorage: {
          key: 'versioned-key',
          versioning: {
            version: 2,
            migrator: ({ legacy }) => legacy as number,
          },
        },
      });

      const retrieved = store.getStorageItem();

      expect(retrieved?.v).toBe(2);
      expect(retrieved?.s).toBe(100);
    });
  });

  describe('setStorageItem', () => {
    it('should store state as envelope in localStorage', () => {
      const store = new GlobalStore(
        { count: 10 },
        {
          localStorage: {
            key: 'test-key',
          },
        },
      );

      store.setStorageItem({ count: 20 });

      const stored = localStorage.getItem('test-key');
      expect(stored).toBeTruthy();

      const parsed = formatFromStore<ItemEnvelope<{ count: number }>>(stored!);
      expect(parsed.s).toEqual({ count: 20 });
    });

    it('should include version in envelope', () => {
      const store = new GlobalStore(0, {
        localStorage: {
          key: 'versioned-key',
          versioning: {
            version: 5,
            migrator: ({ legacy }) => legacy as number,
          },
        },
      });

      store.setStorageItem(42);

      const stored = localStorage.getItem('versioned-key');
      const parsed = formatFromStore<ItemEnvelope<number>>(stored!);

      expect(parsed.v).toBe(5);
      expect(parsed.s).toBe(42);
    });

    it('should use default version when versioning is not configured', () => {
      const store = new GlobalStore(0, {
        localStorage: {
          key: 'default-version-key',
        },
      });

      store.setStorageItem(100);

      const stored = localStorage.getItem('default-version-key');
      const parsed = formatFromStore<ItemEnvelope<number>>(stored!);

      expect(parsed.v).toBe(-1); // default version
    });

    it('should use selector when provided', () => {
      const store = new GlobalStore(
        { name: 'John', age: 30, secret: 'password' },
        {
          localStorage: {
            key: 'selector-key',
            selector: (state) => ({ name: state.name, age: state.age }),
          },
        },
      );

      store.setStorageItem({ name: 'Jane', age: 25, secret: 'newpassword' });

      const stored = localStorage.getItem('selector-key');
      const parsed = formatFromStore<ItemEnvelope<ReturnType<typeof store.getState>>>(stored!);

      expect(parsed.s).toEqual({ name: 'Jane', age: 25 });
      expect(parsed.s.secret).toBeUndefined();
    });
  });

  describe('trySetStorageItem', () => {
    it('should successfully store state', () => {
      const store = new GlobalStore('test', {
        localStorage: {
          key: 'try-set-key',
        },
      });

      store.trySetStorageItem('new value');

      const stored = localStorage.getItem('try-set-key');
      expect(stored).toBeTruthy();

      const parsed = formatFromStore<ItemEnvelope<string>>(stored!);
      expect(parsed.s).toBe('new value');
    });

    it('should handle errors during storage', () => {
      const errorSpy = jest.fn();
      const store = new GlobalStore('test', {
        localStorage: {
          key: 'error-key',
          onError: errorSpy,
        },
      });

      // Mock localStorage.setItem to throw
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      store.trySetStorageItem('value');

      expect(errorSpy).toHaveBeenCalled();

      // Restore
      Storage.prototype.setItem = originalSetItem;
    });

    it('should use custom adapter setItem when provided', () => {
      const customSetItem = jest.fn();
      const store = new GlobalStore(42, {
        localStorage: {
          key: 'adapter-key',
          adapter: {
            setItem: customSetItem,
            getItem: () => 0,
          },
        },
      });

      store.trySetStorageItem(100);

      expect(customSetItem).toHaveBeenCalledWith('adapter-key', 100);
    });
  });

  describe('updateStateWithValidation', () => {
    it('should update state when validator returns undefined', () => {
      const validator = jest.fn();
      const store = new GlobalStore(0, {
        localStorage: {
          key: 'validation-key',
          validator,
        },
      });

      store.updateStateWithValidation(50);

      expect(validator).toHaveBeenCalledWith({ restored: 50, initial: 0 }, expect.any(Object));
      expect(store.getState()).toBe(50);
    });

    it('should use sanitized value when validator returns a value', () => {
      const validator = jest.fn(({ restored, initial }) => {
        if (typeof restored === 'number' && restored > 0) {
          return restored;
        }
        // Return current state when invalid
        return initial;
      });

      const store = new GlobalStore(10, {
        localStorage: {
          key: 'sanitize-key-unique',
          validator,
        },
      });

      // State is 10 after initialization
      expect(store.getState()).toBe(10);

      store.updateStateWithValidation(50);
      expect(store.getState()).toBe(50);

      // When we pass -10, validator gets initial=50 (current state), so it returns 50
      store.updateStateWithValidation(-10);
      expect(store.getState()).toBe(50); // Falls back to current state which is 50
    });

    it('should handle validation errors', () => {
      const errorSpy = jest.fn();
      const validator = jest.fn(() => {
        throw new Error('Validation failed');
      });

      const store = new GlobalStore(0, {
        localStorage: {
          key: 'error-validation-key',
          validator,
          onError: errorSpy,
        },
      });

      store.updateStateWithValidation(100);

      expect(errorSpy).toHaveBeenCalled();
      expect(store.getState()).toBe(0); // Stays at initial value
    });

    it('should store initial state when both restored and sanitized are undefined', () => {
      const store = new GlobalStore(42, {
        localStorage: {
          key: 'undefined-key',
          validator: () => undefined,
        },
      });

      store.updateStateWithValidation(undefined as unknown as number);

      const stored = localStorage.getItem('undefined-key');
      const parsed = formatFromStore<ItemEnvelope<number>>(stored!);

      expect(parsed.s).toBe(42);
    });
  });

  describe('handleStorageError', () => {
    it('should call custom onError when provided', () => {
      const onError = jest.fn();
      const store = new GlobalStore(0, {
        localStorage: {
          key: 'error-handler-key',
          onError,
        },
      });

      const testError = new Error('Test error');
      store.handleStorageError(testError);

      expect(onError).toHaveBeenCalledWith(testError, expect.any(Object));
    });

    it('should log to console when no custom onError is provided', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const store = new GlobalStore(0, {
        name: 'TestStore',
        localStorage: {
          key: 'console-error-key',
        },
      });

      const testError = new Error('Storage error');
      store.handleStorageError(testError);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorMessage = consoleErrorSpy.mock.calls[0][0];
      expect(errorMessage).toContain('react-global-state-hooks');
      expect(errorMessage).toContain('console-error-key');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('isPersistStorageAvailable', () => {
    it('should return true when localStorage is available and key is set', () => {
      const store = new GlobalStore(0, {
        localStorage: {
          key: 'available-key',
        },
      });

      // Access protected method via type assertion
      const isAvailable = store.isPersistStorageAvailable();
      expect(isAvailable).toBe(true);
    });

    it('should return false when no localStorage config', () => {
      const store = new GlobalStore(0);

      const isAvailable = store.isPersistStorageAvailable();
      expect(isAvailable).toBe(false);
    });

    it('should return false when key is not set', () => {
      const store = new GlobalStore(0, {
        localStorage: {
          key: '',
        },
      });

      const isAvailable = store.isPersistStorageAvailable();
      expect(isAvailable).toBe(false);
    });
  });

  describe('onInit with localStorage restoration', () => {
    it('should restore state from localStorage on initialization', () => {
      const envelope: ItemEnvelope<number> = {
        s: 100,
        v: 1,
      };
      localStorage.setItem('init-restore-key', formatToStore(envelope));

      const store = new GlobalStore(0, {
        localStorage: {
          key: 'init-restore-key',
        },
      });

      expect(store.getState()).toBe(100);
    });

    it('should use initial state when nothing in localStorage', () => {
      const store = new GlobalStore(42, {
        localStorage: {
          key: 'init-empty-key',
        },
      });

      expect(store.getState()).toBe(42);

      const stored = localStorage.getItem('init-empty-key');
      expect(stored).toBeTruthy();
    });

    it('should handle custom adapter getItem on init', () => {
      const customGetItem = jest.fn(() => 200);

      const store = new GlobalStore(0, {
        localStorage: {
          key: 'adapter-init-key',
          adapter: {
            getItem: customGetItem,
            setItem: () => {},
          },
        },
      });

      expect(customGetItem).toHaveBeenCalledWith('adapter-init-key');
      expect(store.getState()).toBe(200);
    });

    it('should handle errors during initialization', () => {
      const onError = jest.fn();

      // Set invalid data that will cause parsing error
      localStorage.setItem('init-error-key', 'invalid json {');

      const store = new GlobalStore(0, {
        localStorage: {
          key: 'init-error-key',
          onError,
        },
      });

      expect(onError).toHaveBeenCalled();
      expect(store.getState()).toBe(0);
    });
  });

  describe('versioning and migration', () => {
    it('should migrate when versions differ', () => {
      const oldEnvelope: ItemEnvelope<{ oldField: string }> = {
        s: { oldField: 'old value' },
        v: 1,
      };
      localStorage.setItem('migration-key', formatToStore(oldEnvelope));

      const migrator = jest.fn(({ legacy }) => ({
        newField: legacy.oldField,
      }));

      const store = new GlobalStore(
        { newField: 'initial' },
        {
          localStorage: {
            key: 'migration-key',
            versioning: {
              version: 2,
              migrator,
            },
          },
        },
      );

      expect(migrator).toHaveBeenCalled();
      expect(store.getState()).toEqual({ newField: 'old value' });
    });

    it('should skip migration when versions match', () => {
      const envelope: ItemEnvelope<number> = {
        s: 50,
        v: 3,
      };
      localStorage.setItem('same-version-key', formatToStore(envelope));

      const migrator = jest.fn(({ legacy }) => legacy as number);

      const store = new GlobalStore(0, {
        localStorage: {
          key: 'same-version-key',
          versioning: {
            version: 3,
            migrator,
          },
        },
      });

      expect(migrator).not.toHaveBeenCalled();
      expect(store.getState()).toBe(50);
    });

    it('should handle migration errors', () => {
      const oldEnvelope: ItemEnvelope<{
        data: string;
      }> = {
        s: { data: 'old' },
        v: 1,
      };

      localStorage.setItem('migration-error-key', formatToStore(oldEnvelope));

      const migrator = jest.fn(() => {
        throw new Error('Migration failed');
      });

      const onError = jest.fn();

      const store = new GlobalStore(
        { data: 'initial' },
        {
          localStorage: {
            key: 'migration-error-key',
            versioning: {
              version: 2,
              migrator,
            },
            onError,
          },
        },
      );

      expect(onError).toHaveBeenCalled();
      expect(store.getState()).toEqual({ data: 'initial' });
    });

    it('should skip migration when using adapter', () => {
      const migrator = jest.fn();
      const customGetItem = jest.fn(() => 100);

      const store = new GlobalStore(0, {
        localStorage: {
          key: 'adapter-no-migration-key',
          versioning: {
            version: 2,
            migrator,
          },
          adapter: {
            getItem: customGetItem,
            setItem: () => {},
          },
        },
      });

      expect(migrator).not.toHaveBeenCalled();
      expect(store.getState()).toBe(100);
    });
  });

  describe('selector in localStorage', () => {
    it('should merge selected stored state with initial state on restore', () => {
      const partialState = { name: 'Stored Name' };
      const envelope: ItemEnvelope<typeof partialState> = {
        s: partialState,
        v: 1,
      };
      localStorage.setItem('selector-restore-key', formatToStore(envelope));

      const initialState = { name: 'Initial', age: 30, city: 'NYC' };

      const store = new GlobalStore(initialState, {
        localStorage: {
          key: 'selector-restore-key',
          selector: (state) => ({ name: state.name }),
        },
      });

      const state = store.getState();
      expect(state.name).toBe('Stored Name');
      expect(state.age).toBe(30);
      expect(state.city).toBe('NYC');
    });

    it('should not merge when stored state is primitive', () => {
      const envelope: ItemEnvelope<number> = {
        s: 100,
        v: 1,
      };
      localStorage.setItem('primitive-selector-key', formatToStore(envelope));

      const store = new GlobalStore(0, {
        localStorage: {
          key: 'primitive-selector-key',
          selector: (state) => state,
        },
      });

      expect(store.getState()).toBe(100);
    });
  });

  describe('reset with localStorage', () => {
    it('should clear localStorage and reset state when reset is called without arguments', () => {
      const store = new GlobalStore(() => 0, {
        localStorage: {
          key: 'reset-unique-key-final-test',
        },
      });

      // Set state to something other than initial
      store.setState(100);
      expect(store.getState()).toBe(100);

      // Call reset
      store.reset();

      // After reset, state should be back to initial (0)
      expect(store.getState()).toBe(0);

      // localStorage should now contain the initial state (0)
      // because onStateChanged saves the new state after reset
      const stored = localStorage.getItem('reset-unique-key-final-test');
      const parsed = formatFromStore<ItemEnvelope<number>>(stored!);
      expect(parsed.s).toBe(0);
    });

    it('should handle reset with custom state and metadata', () => {
      const store = new GlobalStore(() => 0, {
        metadata: () => ({ count: 0 }),
        localStorage: {
          key: 'reset-custom-state-key',
        },
      });

      store.setState(100);
      store.setMetadata({ count: 10 });

      const initialState = store.getState();
      const initialMetadata = store.getMetadata();

      expect(initialState).toBe(100);
      expect(initialMetadata.count).toBe(10);

      // Clear localStorage before calling reset with custom values
      // This prevents the old state from being restored
      localStorage.removeItem('reset-custom-state-key');

      store.reset(50, { count: 5 });

      // After reset with new values, state and metadata should be updated
      expect(store.getState()).toBe(50);
      expect(store.getMetadata().count).toBe(5);

      // localStorage should contain the new reset state
      const stored = localStorage.getItem('reset-custom-state-key');
      const parsed = formatFromStore<ItemEnvelope<number>>(stored!);
      expect(parsed.s).toBe(50);
    });

    it('should not clear localStorage when reset with custom values', () => {
      localStorage.setItem('reset-custom-key', formatToStore({ s: 100, v: 1 }));

      const store = new GlobalStore(0, {
        metadata: {},
        localStorage: {
          key: 'reset-custom-key',
        },
      });

      store.reset(200, {});

      // localStorage should still have data
      expect(localStorage.getItem('reset-custom-key')).toBeTruthy();
    });
  });

  describe('onStateChanged with localStorage sync', () => {
    it('should sync state to localStorage on state change', () => {
      const store = new GlobalStore(0, {
        localStorage: {
          key: 'sync-key',
        },
      });

      store.setState(42);

      const stored = localStorage.getItem('sync-key');
      const parsed = formatFromStore<ItemEnvelope<number>>(stored!);
      expect(parsed.s).toBe(42);
    });

    it('should use adapter setItem when provided on state change', () => {
      const customSetItem = jest.fn();

      const store = new GlobalStore(0, {
        localStorage: {
          key: 'adapter-sync-key',
          adapter: {
            getItem: () => 0,
            setItem: customSetItem,
          },
        },
      });

      store.setState(100);

      expect(customSetItem).toHaveBeenCalledWith('adapter-sync-key', 100);
    });

    it('should handle sync errors gracefully', () => {
      const onError = jest.fn();
      const store = new GlobalStore(0, {
        localStorage: {
          key: 'sync-error-key',
          onError,
        },
      });

      // Mock to throw on setItem
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = jest.fn(() => {
        throw new Error('Sync failed');
      });

      store.setState(100);

      expect(onError).toHaveBeenCalled();

      Storage.prototype.setItem = originalSetItem;
    });
  });
});
