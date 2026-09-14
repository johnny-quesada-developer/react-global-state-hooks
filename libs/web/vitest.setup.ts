import { afterEach, vi } from 'vitest';

// This variant injects no extra keys into store metadata (see the shared suite's
// expectMetadata helper). Declared explicitly for clarity / future-proofing.
globalThis.__VARIANT_METADATA_KEYS__ = [];

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.clearAllTimers();
  window.localStorage.clear();
});

export {};
