// This variant injects no extra keys into store metadata (see the shared suite's
// expectMetadata helper). Declared explicitly for clarity / future-proofing.
globalThis.__VARIANT_METADATA_KEYS__ = [];

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  jest.clearAllTimers();
  window.localStorage.clear();
});

export {};
