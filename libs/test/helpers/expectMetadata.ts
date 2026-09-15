/**
 * Variant-aware metadata assertion for the shared test suite.
 *
 * Every variant's store carries the user-provided metadata, but some variants ALSO inject their
 * own reserved fields into every store's metadata (the react-native variant adds
 * `isAsyncStorageReady` and `asyncStorageKey`). A plain `toEqual({ ...user })` would then fail on
 * those variants, while a blanket `toMatchObject({ ...user })` would be too weak — it would stop
 * catching genuinely unexpected keys.
 *
 * `expectMetadata(received).toMatch(expected)` gives the best of both:
 *   - every key/value in `expected` must be present and deep-equal, AND
 *   - the ONLY additional keys allowed are the running variant's reserved metadata keys.
 *
 * So for universal/web (no reserved keys) it is an exact match; for the react-native variant it
 * is "exactly `expected` plus its known async-storage fields, and nothing else".
 *
 * Each variant declares its reserved keys from its `vitest.setup.ts`:
 *   globalThis.__VARIANT_METADATA_KEYS__ = ['isAsyncStorageReady', 'asyncStorageKey'];
 * Variants that add nothing can leave it unset (treated as []).
 */

declare global {
  var __VARIANT_METADATA_KEYS__: string[] | undefined;
}

function reservedKeys(): string[] {
  return globalThis.__VARIANT_METADATA_KEYS__ ?? [];
}

export function expectMetadata(received: unknown) {
  return {
    /**
     * Assert the metadata equals `expected`, tolerating only the running variant's reserved
     * metadata keys as extras. This runs exactly ONE underlying `expect` so it plays nicely with
     * `expect.assertions(n)` counts in the shared tests.
     */
    toMatch(expected: Record<string, unknown>): void {
      const actual = { ...(received as Record<string, unknown>) };

      // Drop the running variant's reserved metadata keys (e.g. the react-native variant's
      // `isAsyncStorageReady` / `asyncStorageKey`) UNLESS the test explicitly expects them.
      // Any other key survives and must match `expected`, so genuinely unexpected keys still fail.
      for (const key of reservedKeys()) {
        if (!(key in expected)) delete actual[key];
      }

      expect(actual).toEqual(expected);
    },
  };
}
