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
    const input = [
      'at a (http://x/chunk-A.js?v=111:1:1)',
      'at b (http://x/chunk-B.js?v=222:2:2)',
    ].join('\n');
    expect(normalizeStatePath(input)).toBe(['at a (http://x/chunk-A.js:1:1)', 'at b (http://x/chunk-B.js:2:2)'].join('\n'));
  });

  it('leaves paths without a ?v= token untouched', () => {
    const input = 'Error\n    at new GlobalStore (http://localhost:5199/@fs/src/GlobalStore.ts:42:25)';
    expect(normalizeStatePath(input)).toBe(input);
  });

  it('handles empty input', () => {
    expect(normalizeStatePath('')).toBe('');
  });
});
