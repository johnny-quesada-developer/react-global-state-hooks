import { beforeEach, vi } from 'vitest';
import { getFakeAsyncStorage } from '../test/helpers/getFakeAsyncStorage';

// Reserved metadata keys this variant injects into every store's metadata. The shared suite's
// `expectMetadata(...).toMatch(...)` helper tolerates these as allowed extras while still
// rejecting any other unexpected key.
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
const AsyncStorage = (
  await import('@react-native-async-storage/async-storage')
).default as unknown as {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.clearAllTimers();

  AsyncStorage.getItem.mockImplementation(asyncStorage.getItem);
  AsyncStorage.setItem.mockImplementation(asyncStorage.setItem);
});

export {};
