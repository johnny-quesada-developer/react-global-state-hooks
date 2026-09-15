import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Tests resolve the state libraries + debug patch from monorepo SOURCE, exactly like the app
// (see vite.config.ts). The alias set is duplicated here (rather than importing the vite config)
// to avoid pulling in the app's build-only plugins (vite-plugin-checker, copy-manifest).
const webSrc = path.resolve(__dirname, '../../libs/web/src');
const universalSrc = path.resolve(__dirname, '../../libs/universal/src');
const monkeyPatchSrc = path.resolve(__dirname, '../../libs/monkey_patch/src');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@src', replacement: path.resolve(__dirname, './src') },
      { find: '@assets', replacement: path.resolve(__dirname, './src/assets') },
      { find: '@shared', replacement: path.resolve(__dirname, './src/shared') },
      { find: '@pages/shared', replacement: path.resolve(__dirname, './src/pages/shared') },
      { find: '@pages', replacement: path.resolve(__dirname, './src/pages') },
      { find: '@main_tab', replacement: path.resolve(__dirname, './src/pages/main_tab') },
      { find: /^react-global-state-hooks\/(.*)$/, replacement: `${webSrc}/$1` },
      { find: /^react-global-state-hooks$/, replacement: `${webSrc}/index.ts` },
      { find: /^react-hooks-global-states-debug\/(.*)$/, replacement: `${monkeyPatchSrc}/$1` },
      { find: /^react-hooks-global-states-debug$/, replacement: `${monkeyPatchSrc}/debug.ts` },
      { find: /^react-hooks-global-states\/(.*)$/, replacement: `${universalSrc}/$1` },
      { find: /^react-hooks-global-states$/, replacement: `${universalSrc}/index.ts` },
    ],
    extensions: ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'src/**/*.mocks.ts',
        'src/**/*.types.ts',
        'src/vite-env.d.ts',
        'src/text-diff.d.ts',
        'vitest.setup.ts',
      ],
    },
  },
});
