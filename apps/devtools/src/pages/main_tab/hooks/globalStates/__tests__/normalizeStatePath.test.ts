import { describe, it, expect } from 'vitest';
import { normalizeStatePath } from '../helpers/normalizeStatePath';

describe('normalizeStatePath', () => {
  it('strips the Vite optimizer ?v= token so the same site matches across reloads', () => {
    const a =
      'Error\n    at mountState (http://localhost:5199/node_modules/.vite/deps/chunk-EQIWKXWS.js?v=ba65e710:12005:28)';
    const b =
      'Error\n    at mountState (http://localhost:5199/node_modules/.vite/deps/chunk-EQIWKXWS.js?v=1ddc2f25:12005:28)';

    expect(normalizeStatePath(a)).toBe(normalizeStatePath(b));
    expect(normalizeStatePath(a)).not.toContain('?v=');
  });

  it('keeps the stable structure (module path + line:col)', () => {
    const input =
      'at useState (http://localhost:5199/node_modules/.vite/deps/chunk-NMLDSBBN.js?v=abc123:1066:29)';
    expect(normalizeStatePath(input)).toBe(
      'at useState (http://localhost:5199/node_modules/.vite/deps/chunk-NMLDSBBN.js:1066:29)',
    );
  });

  it('strips every ?v= token across a multi-frame stack', () => {
    const input = ['at a (http://x/chunk-A.js?v=111:1:1)', 'at b (http://x/chunk-B.js?v=222:2:2)'].join('\n');
    expect(normalizeStatePath(input)).toBe(
      ['at a (http://x/chunk-A.js:1:1)', 'at b (http://x/chunk-B.js:2:2)'].join('\n'),
    );
  });

  it('strips the HMR ?t= timestamp on a module frame so a site matches across edits', () => {
    const before = 'Error\n    at http://localhost:5199/src/stores/auth.ts?t=1111111111111:15:30';
    const after = 'Error\n    at http://localhost:5199/src/stores/auth.ts?t=2222222222222:15:30';

    expect(normalizeStatePath(before)).toBe(normalizeStatePath(after));
    expect(normalizeStatePath(before)).not.toContain('?t=');
  });

  it('leaves paths without a query token untouched', () => {
    const input = 'Error\n    at new GlobalStore (http://localhost:5199/@fs/src/GlobalStore.ts:42:25)';
    expect(normalizeStatePath(input)).toBe(input);
  });

  it('handles empty input', () => {
    expect(normalizeStatePath('')).toBe('');
  });
});
