import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import checker from 'vite-plugin-checker';
import fs from 'node:fs';
import path from 'node:path';

// Vite builds the React panel UI (the DevTools panel + secondary/local entries) into dist/.
// The extension's non-UI lib bundles are built by webpack (see webpack.config.cjs) into
// dist/lib; `emptyOutDir: false` here so the two builds don't wipe each other.
//
// The panel consumes the state libraries + the debug patch from monorepo SOURCE, not published
// packages, so a change in any lib is reflected immediately:
//   react-global-state-hooks       -> libs/web/src
//   react-hooks-global-states       -> libs/universal/src (web re-exports from it)
//   react-hooks-global-states-debug -> libs/monkey_patch/src
const webSrc = path.resolve(__dirname, '../../libs/web/src');
const universalSrc = path.resolve(__dirname, '../../libs/universal/src');
const monkeyPatchSrc = path.resolve(__dirname, '../../libs/monkey_patch/src');

// Copy the extension's static files (manifest, panel HTML, icons) from src into dist so a build
// is directly loadable in chrome://extensions.
const copyRequiredFiles = () => ({
  name: 'copy-manifest',
  closeBundle() {
    fs.mkdirSync(path.resolve(__dirname, 'dist/assets'), { recursive: true });
    [
      'manifest.json',
      'devtools_page.html',
      'assets/devtools_page_icon.ico',
      'assets/devtools_page_icon-28px.ico',
    ].forEach((file) => {
      fs.copyFileSync(
        path.resolve(__dirname, `src/${file}`),
        path.resolve(__dirname, `dist/${file}`),
      );
    });
  },
});

export default defineConfig(({ mode }) => {
  const isProduction = mode !== 'development';

  // The production extension ships index.html + main_tab.html. The local preview page
  // (index.local.html -> src/index.dev.tsx) seeds mock data and is only built in development so
  // mock fixtures never leak into the prod bundle.
  const rollupInput: Record<string, string> = {
    index: path.resolve(__dirname, 'index.html'),
    main_tab: path.resolve(__dirname, 'main_tab.html'),
  };
  if (!isProduction) {
    rollupInput['index.local'] = path.resolve(__dirname, 'index.local.html');
  }

  return {
    plugins: [
      react(),
      copyRequiredFiles(),
      checker({ typescript: { tsconfigPath: 'tsconfig.app.json' } }),
    ],
    build: {
      sourcemap: !isProduction,
      minify: isProduction ? 'terser' : false,
      emptyOutDir: false,
      rollupOptions: { input: rollupInput },
      terserOptions: { sourceMap: !isProduction },
    },
    resolve: {
      alias: [
        // Local app aliases.
        { find: '@src', replacement: path.resolve(__dirname, './src') },
        { find: '@assets', replacement: path.resolve(__dirname, './src/assets') },
        { find: '@shared', replacement: path.resolve(__dirname, './src/shared') },
        { find: '@pages/shared', replacement: path.resolve(__dirname, './src/pages/shared') },
        { find: '@pages', replacement: path.resolve(__dirname, './src/pages') },
        { find: '@main_tab', replacement: path.resolve(__dirname, './src/pages/main_tab') },
        // Monorepo source aliases (deep subpaths before the bare barrels).
        { find: /^react-global-state-hooks\/(.*)$/, replacement: `${webSrc}/$1` },
        { find: /^react-global-state-hooks$/, replacement: `${webSrc}/index.ts` },
        { find: /^react-hooks-global-states-debug\/(.*)$/, replacement: `${monkeyPatchSrc}/$1` },
        { find: /^react-hooks-global-states-debug$/, replacement: `${monkeyPatchSrc}/debug.ts` },
        { find: /^react-hooks-global-states\/(.*)$/, replacement: `${universalSrc}/$1` },
        { find: /^react-hooks-global-states$/, replacement: `${universalSrc}/index.ts` },
      ],
      extensions: ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json'],
    },
    server: { port: 5200 },
  };
});
