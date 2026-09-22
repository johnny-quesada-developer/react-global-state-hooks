import uniqueId, { uniqueId as namedUniqueId } from 'global-state-hooks-under-test/uniqueId';
import * as uniqueIdNamespace from 'global-state-hooks-under-test/uniqueId';

// Source exports; built ESM/CJS and packed-package checks live in scripts/test-interop.ts.
describe('uniqueId source exports', () => {
  it('exposes the same callable function as default and named exports', () => {
    expect(typeof uniqueId).toBe('function');
    expect(namedUniqueId).toBe(uniqueId);
    expect(uniqueId('test:')).toMatch(/^test:.+/);
  });

  it('exports only default and uniqueId', () => {
    expect(Object.keys(uniqueIdNamespace).sort()).toEqual(['default', 'uniqueId']);
  });
});
