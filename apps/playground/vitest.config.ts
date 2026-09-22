import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// Reuse the app's Vite config (React plugin + the source aliases) so tests run the playground
// against the same monorepo source the dev server does.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      // Minimal per-test output: with this many tests the default verbose reporter dominates runtime.
      reporters: ['dot'],
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
    },
  }),
);
