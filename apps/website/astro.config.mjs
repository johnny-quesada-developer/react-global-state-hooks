import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const libs = (path) => fileURLToPath(new URL(`../../libs/${path}`, import.meta.url));
const here = (path) => fileURLToPath(new URL(path, import.meta.url));

// Site URL and base path live in apps/website/.env (PUBLIC_SITE_URL, PUBLIC_BASE_PATH).
const env = loadEnv('production', fileURLToPath(new URL('.', import.meta.url)), 'PUBLIC_');
const SITE = env.PUBLIC_SITE_URL;
const BASE = env.PUBLIC_BASE_PATH;

if (!SITE || !BASE) throw new Error('PUBLIC_SITE_URL and PUBLIC_BASE_PATH must be set in apps/website/.env');

const webIndex = `${libs('web/src')}/index.ts`;
const debugLibrary = here('./src/lib/debugLibrary.ts');

const debugEntry = /[\\/]libs[\\/](web|universal)[\\/]src[\\/]debug(\.ts)?$/;

const debugEverywhere = {
  name: 'debug-everywhere',
  enforce: 'pre',
  async resolveId(id, importer, options) {
    if (options?.ssr) return null;
    if (id === webIndex && importer !== debugLibrary) return debugLibrary;
    if (!debugEntry.test(id)) return null;

    const resolved = await this.resolve(id, importer, { ...options, skipSelf: true });
    return resolved && { ...resolved, moduleSideEffects: true };
  },
};

export default defineConfig({
  site: SITE,
  base: BASE,
  output: 'static',
  trailingSlash: 'always',
  // The bottom-of-page Astro toolbar is a dev-server-only overlay; turned off so it can never show up.
  devToolbar: { enabled: false },
  build: { format: 'directory' },
  integrations: [react(), mdx(), sitemap()],
  markdown: {
    shikiConfig: { theme: 'github-light' },
  },
  vite: {
    plugins: [debugEverywhere],
    // Examples run against monorepo SOURCE (same convention as apps/playground), so the site
    // always documents the version in this workspace. Subpath aliases precede bare-name aliases.
    resolve: {
      alias: [
        { find: /^@snippets\/(.*)$/, replacement: `${here('./src/snippets')}/$1` },
        { find: /^@examples\/(.*)$/, replacement: `${here('./src/examples')}/$1` },
        { find: /^react-global-state-hooks\/(.*)$/, replacement: `${libs('web/src')}/$1` },
        { find: /^react-global-state-hooks$/, replacement: `${libs('web/src')}/index.ts` },
        { find: /^react-hooks-global-states-debug$/, replacement: `${libs('monkey_patch/src')}/debug.ts` },
        { find: /^react-hooks-global-states-debug\/(.*)$/, replacement: `${libs('monkey_patch/src')}/$1` },
        { find: /^react-hooks-global-states\/(.*)$/, replacement: `${libs('universal/src')}/$1` },
        { find: /^react-hooks-global-states$/, replacement: `${libs('universal/src')}/index.ts` },
      ],
    },
  },
});
