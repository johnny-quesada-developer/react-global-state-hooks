import { defineWorkspace } from 'vitest/config';
import path from 'node:path';

// monkey_patch consumes the base library by the name `react-global-state-hooks` (the web
// variant). In the monorepo that is libs/web; resolve it to web's SOURCE so tests run against
// the local code. web's source in turn re-exports from `react-hooks-global-states` (= libs/
// universal), so that name must be aliased to universal's source too. Order matters: subpath
// aliases must precede the bare-name aliases.
const webSrc = path.resolve(__dirname, '../web/src');
const universalSrc = path.resolve(__dirname, '../universal/src');

// Aliases that resolve the base library names to monorepo SOURCE. Included in every project so
// the debug patch (src/debug.ts, which imports from `react-global-state-hooks`) and the subject
// under test resolve to the exact same module instances.
const baseLibraryAlias = [
  { find: /^react-global-state-hooks\/(.*)$/, replacement: `${webSrc}/$1` },
  { find: /^react-global-state-hooks$/, replacement: `${webSrc}/index.ts` },
  { find: /^react-hooks-global-states\/(.*)$/, replacement: `${universalSrc}/$1` },
  { find: /^react-hooks-global-states$/, replacement: `${universalSrc}/index.ts` },
];

// The neutral subject alias used by the shared suite (libs/shared-tests). Each shared project
// points it at a different variant's source, so the SAME shared files run against that variant.
const neutralAlias = (variantSrc: string) => [
  { find: /^global-state-hooks-under-test\/(.*)$/, replacement: `${variantSrc}/$1` },
  { find: /^global-state-hooks-under-test$/, replacement: `${variantSrc}/index.ts` },
];

// Resolve extensionless TS subpath aliases (e.g. react-global-state-hooks/uniqueId).
const extensions = ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json'];

// Three projects run in one `vitest run`:
//  - unit:             monkey_patch's own unit tests (patch internals), unchanged.
//  - shared-universal: the reusable shared suite (libs/shared-tests) with the debug patch
//                      installed, subject = universal variant.
//  - shared-web:       the same shared suite with the patch installed, subject = web variant.
// The two shared projects are the regression guarantee that the debug patch does not alter the
// libraries' behavior (run with DEBUG_PATCH=off for the unpatched parity baseline).
export default defineWorkspace([
  {
    resolve: { alias: [...baseLibraryAlias], extensions },
    test: {
      name: 'unit',
      root: __dirname,
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./vitest.setup.ts'],
      include: ['__test__/**/*.{test,spec}.{ts,tsx}'],
    },
  },
  {
    resolve: { alias: [...neutralAlias(universalSrc), ...baseLibraryAlias], extensions },
    test: {
      name: 'shared-universal',
      root: __dirname,
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./vitest.setup.patched.ts'],
      include: ['../shared-tests/**/*.{test,spec}.{ts,tsx}'],
    },
  },
  {
    resolve: { alias: [...neutralAlias(webSrc), ...baseLibraryAlias], extensions },
    test: {
      name: 'shared-web',
      root: __dirname,
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./vitest.setup.patched.ts'],
      include: ['../shared-tests/**/*.{test,spec}.{ts,tsx}'],
    },
  },
]);
