import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
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

        // Exclude build configurations
        'webpack.config.cjs',
        'webpack.config.monkey_patch.cjs',
        'eslint.config.js',
        'postcss.config.js',
        'tailwind.config.js',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
    },
  },
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@main_tab': path.resolve(__dirname, './src/pages/main_tab'),
    },
  },
});
