import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const libs = (path: string) => fileURLToPath(new URL(`../../libs/${path}`, import.meta.url));
const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// Same source aliases as astro.config.mjs: tests execute the exact snippets and examples the site
// displays, against the workspace source of the documented library version.
export default defineConfig({
  // Astro exposes PUBLIC_* variables from .env; mirror that so src/lib/site.ts works in tests.
  envPrefix: 'PUBLIC_',
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@snippets\/(.*)$/, replacement: `${here('./src/snippets')}/$1` },
      { find: /^@examples\/(.*)$/, replacement: `${here('./src/examples')}/$1` },
      { find: /^react-global-state-hooks\/(.*)$/, replacement: `${libs('web/src')}/$1` },
      { find: /^react-global-state-hooks$/, replacement: `${libs('web/src')}/index.ts` },
      { find: /^react-hooks-global-states\/(.*)$/, replacement: `${libs('universal/src')}/$1` },
      { find: /^react-hooks-global-states$/, replacement: `${libs('universal/src')}/index.ts` },
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    reporters: ['dot'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
