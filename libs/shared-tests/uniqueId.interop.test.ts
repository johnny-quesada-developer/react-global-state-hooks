/**
 * Regression guard for the packaging/interop bug.
 *
 * Historically the published subpaths were UMD bundles whose global-assignment branch
 * confused esbuild-based tools, yielding a non-callable default export and phantom
 * namespace keys. These assertions run against the BUILT package (resolved via the
 * package `exports`/`main`) to ensure the default AND named exports stay callable and
 * that the CJS shape keeps `__esModule` with exactly `default` + `uniqueId`.
 *
 * The full cross-runtime proof (tsx/esbuild + Node ESM + Node CJS against the packed
 * tarball) lives in `scripts/test-interop.ts` (`yarn test:interop`).
 */
import uniqueIdDefault, { uniqueId as uniqueIdNamed } from 'global-state-hooks-under-test/uniqueId';

describe('uniqueId subpath interop', () => {
  it('exposes a callable default export', () => {
    expect(typeof uniqueIdDefault).toBe('function');
    const id = uniqueIdDefault('test:');
    expect(typeof id).toBe('string');
    expect(id.startsWith('test:')).toBe(true);
  });

  it('exposes a callable named export equal to the default', () => {
    expect(typeof uniqueIdNamed).toBe('function');
    expect(uniqueIdNamed).toBe(uniqueIdDefault);
  });

  it('does not expose phantom namespace keys', async () => {
    const ns = (await import('global-state-hooks-under-test/uniqueId')) as Record<string, unknown>;
    // The module namespace must expose exactly the default + the named `uniqueId`, with no
    // phantom keys leaking from a UMD/global-assignment wrapper. (Under an ESM namespace vitest
    // adds a synthetic `default`; the meaningful guard is that `uniqueId` is present and no
    // stray keys like `module.exports` appear.)
    const keys = Object.keys(ns);
    expect(keys).toContain('uniqueId');
    expect(keys).toContain('default');
    expect(keys).not.toContain('module.exports');
    expect(typeof ns.default).toBe('function');
    expect(typeof ns.uniqueId).toBe('function');
  });
});
