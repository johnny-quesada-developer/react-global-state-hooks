import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Tests run against the TypeScript SOURCE. The shared suite imports the subject under test via
// the neutral alias `global-state-hooks-under-test`, resolved here to THIS variant's src. The
// built-artifact / CJS-shape correctness is verified separately by `yarn test:interop`.
const src = path.resolve(__dirname, 'src');

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Minimal per-test output: with this many tests the default verbose reporter dominates runtime.
    reporters: ['dot'],
    // The universal variant is the base behavior; it runs the neutral suite (test/universal) and
    // has no persistence-specific tests of its own.
    include: ['../test/universal/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: [
      { find: /^global-state-hooks-under-test\/(.*)$/, replacement: `${src}/$1` },
      { find: /^global-state-hooks-under-test$/, replacement: `${src}/index.ts` },
    ],
  },
});
