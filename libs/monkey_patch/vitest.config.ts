import { defineConfig } from 'vitest/config';
import path from 'node:path';

// monkey_patch consumes the base library by the name `react-global-state-hooks` (the web
// variant). In the monorepo that is libs/web; resolve it to web's SOURCE so tests run against
// the local code. web's source in turn re-exports from `react-hooks-global-states` (= libs/
// universal), so that name must be aliased to universal's source too. Order matters: subpath
// aliases must precede the bare-name aliases.
const webSrc = path.resolve(__dirname, '../web/src');
const universalSrc = path.resolve(__dirname, '../universal/src');

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['__test__/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: [
      { find: /^react-global-state-hooks\/(.*)$/, replacement: `${webSrc}/$1` },
      { find: /^react-global-state-hooks$/, replacement: `${webSrc}/index.ts` },
      { find: /^react-hooks-global-states\/(.*)$/, replacement: `${universalSrc}/$1` },
      { find: /^react-hooks-global-states$/, replacement: `${universalSrc}/index.ts` },
    ],
  },
});
