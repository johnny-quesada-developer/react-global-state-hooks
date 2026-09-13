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
import uniqueIdDefault, { uniqueId as uniqueIdNamed } from '@react-hooks-global-states/uniqueId';

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

  it('does not expose phantom namespace keys', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ns = require('@react-hooks-global-states/uniqueId');
    const keys = Object.keys(ns).sort();
    expect(keys).toEqual(['default', 'uniqueId']);
    expect(ns.__esModule).toBe(true);
    expect(keys).not.toContain('module.exports');
  });
});
