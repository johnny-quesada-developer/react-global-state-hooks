import { getFakeAsyncStorage } from "./__test__/getFakeAsyncStorage";

// Reserved metadata keys this variant injects into every store's metadata. The shared suite's
// `expectMetadata(...).toMatch(...)` helper tolerates these as allowed extras while still
// rejecting any other unexpected key.
globalThis.__VARIANT_METADATA_KEYS__ = ["isAsyncStorageReady", "asyncStorageKey"];

const { fakeAsyncStorage: asyncStorage } = getFakeAsyncStorage();

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

const AsyncStorage = jest.requireMock("@react-native-async-storage/async-storage").default;

beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();

  AsyncStorage.getItem.mockImplementation(asyncStorage.getItem);
  AsyncStorage.setItem.mockImplementation(asyncStorage.setItem);
});

export {};
