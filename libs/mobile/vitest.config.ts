import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Tests run against the TypeScript SOURCE. The shared suite imports the subject under test via
// the neutral alias `global-state-hooks-under-test`, resolved here to THIS variant's src. This
// variant re-exports from the base package `react-hooks-global-states`, resolved to the sibling
// universal src. Built-artifact / CJS-shape correctness is verified separately by
// `yarn test:interop`.
const src = path.resolve(__dirname, 'src');
const baseSrc = path.resolve(__dirname, '../universal/src');

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['__test__/**/*.{test,spec}.{ts,tsx}', '../shared-tests/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: [
      // Deep subpaths must be listed before the bare barrel so they win for deep imports.
      { find: /^react-native-global-state-hooks\/(.*)$/, replacement: `${src}/$1` },
      { find: /^react-native-global-state-hooks$/, replacement: `${src}/index.ts` },
      { find: /^global-state-hooks-under-test\/(.*)$/, replacement: `${src}/$1` },
      { find: /^global-state-hooks-under-test$/, replacement: `${src}/index.ts` },
      // Base package resolved from the sibling universal workspace source.
      { find: /^react-hooks-global-states\/(.*)$/, replacement: `${baseSrc}/$1` },
      { find: /^react-hooks-global-states$/, replacement: `${baseSrc}/index.ts` },
    ],
  },
});
