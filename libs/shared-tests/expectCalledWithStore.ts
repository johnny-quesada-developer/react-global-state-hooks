/**
 * Patch-aware "called with a store object" assertion for the shared test suite.
 *
 * A lifecycle callback (onInit / onMounted) receives the store-tools object. A test then asserts
 * it was called with the same object it reads later as `context.current`. Two environment
 * differences make a plain `toHaveBeenCalledWith(context.current)` brittle:
 *
 *  1) The captured callback arg and `context.current` are the SAME object reference in a plain
 *     variant, so exact equality holds. The debug monkey patch
 *     (react-hooks-global-states-debug) REPLACES store methods with logging wrappers
 *     (`setState`, `dispose`, ...) and ADDS reserved bookkeeping keys (`_DEV_TOOLS_*`) after the
 *     callback already captured the object — so the two diverge by method identity and by keys.
 *  2) `context.current` can be a superset of the callback arg (e.g. context tools expose `use`
 *     which the onInit arg does not).
 *
 * `expectCalledWithStore(spy).toHaveBeenCalledWith(expected)` compares the recorded call against
 * `expected` such that: every key the recorded arg actually has must be accounted for by
 * `expected` — data fields deep-equal, function fields match by TYPE (so a wrapped method still
 * matches) — while reserved bookkeeping keys are ignored on both sides. Keys that exist only on
 * `expected` (like `use`) are not required.
 *
 * For a plain variant (no reserved keys, no wrapping) this is equivalent to the original exact
 * assertion: the recorded arg IS `context.current`, so every one of its fields matches.
 *
 * The running environment declares its reserved store keys from its vitest setup:
 *   globalThis.__PATCH_RESERVED_STORE_KEYS__ = ['_DEV_TOOLS_STORE_ID', ...];
 * Environments that augment nothing can leave it unset (treated as []).
 */

declare global {
  var __PATCH_RESERVED_STORE_KEYS__: string[] | undefined;
}

function reservedStoreKeys(): string[] {
  return globalThis.__PATCH_RESERVED_STORE_KEYS__ ?? [];
}

export function expectCalledWithStore(spy: unknown) {
  return {
    /**
     * Assert the spy was called with a store object equivalent to `expected`. Runs exactly ONE
     * underlying `expect` so it plays nicely with `expect.assertions(n)` counts.
     */
    toHaveBeenCalledWith(expected: object): void {
      // Fast path: nothing augments the store -> behave exactly like toHaveBeenCalledWith so the
      // plain variants keep full-strictness (exact keys and identical method references).
      if (reservedStoreKeys().length === 0) {
        expect(spy as { mock: unknown }).toHaveBeenCalledWith(expected);
        return;
      }

      const keys = reservedStoreKeys();
      const expectedRecord = expected as Record<string, unknown>;

      // Build an objectContaining shape from the fields the recorded arg carries, matching each
      // against `expected`: functions by type (the patch may have wrapped them), data by value.
      // Reserved bookkeeping keys are ignored. `objectContaining` then tolerates the patch's
      // extra keys on the recorded arg.
      const calls = (spy as { mock: { calls: unknown[][] } }).mock.calls;

      // Match a field value against `expected`: functions by TYPE (the patch may wrap them),
      // plain objects whose values are functions (e.g. `actions`) by shape (each entry any
      // function), everything else by deep-equal value.
      const toMatcher = (value: unknown): unknown => {
        if (typeof value === 'function') return expect.any(Function);
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          const entries = Object.entries(value as Record<string, unknown>);
          if (entries.length > 0 && entries.every(([, v]) => typeof v === 'function')) {
            return expect.objectContaining(
              Object.fromEntries(entries.map(([k]) => [k, expect.any(Function)])),
            );
          }
        }
        return value;
      };

      const buildShape = (arg: Record<string, unknown>): Record<string, unknown> => {
        const shape: Record<string, unknown> = {};
        for (const key of Object.keys(arg)) {
          if (keys.includes(key)) continue;
          shape[key] = toMatcher(expectedRecord[key]);
        }
        return shape;
      };

      // Assert at least one recorded call matches. Use the first call's arg to derive the shape;
      // all lifecycle calls in the shared suite pass the same store object, so one shape suffices.
      const firstArg = (calls[0]?.[0] ?? {}) as Record<string, unknown>;
      expect(spy as { mock: unknown }).toHaveBeenCalledWith(expect.objectContaining(buildShape(firstArg)));
    },
  };
}
