// Patched-run setup for the NATIVE suite (test/universal + test/native), subject = mobile.
//
// It layers the mobile variant's test environment on top of the base patched setup: the base
// installs the debug patch + shared harness (hook stub, postMessage polyfill, reserved-key
// declarations, cleanup); this file adds the async-storage mock the native suite needs and
// overrides the reserved metadata keys to match the mobile variant.

// Base patched harness runs first (installs the patch, sets __PATCH_RESERVED_STORE_KEYS__, etc.).
import './vitest.setup.patched';

import { beforeEach, vi } from 'vitest';
import { getFakeAsyncStorage } from '../test/helpers/getFakeAsyncStorage';

// The mobile variant injects these reserved keys into every store's metadata. Override the base
// setup's empty default so expectMetadata tolerates them. See libs/test/helpers/expectMetadata.ts.
globalThis.__VARIANT_METADATA_KEYS__ = ['isAsyncStorageReady', 'asyncStorageKey'];

const { fakeAsyncStorage: asyncStorage } = getFakeAsyncStorage();

vi.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

// Resolve the mocked module to wire real fake-storage implementations in each test.
const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default as unknown as {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.clearAllTimers();

  AsyncStorage.getItem.mockImplementation(asyncStorage.getItem);
  AsyncStorage.setItem.mockImplementation(asyncStorage.setItem);
});
