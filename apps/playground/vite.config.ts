import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// The playground runs as a normal dev-mode React app (no StrictMode) so React DevTools reports a
// "development" build, which is what the debug hook needs to attach.
//
// It consumes the state libraries and the debug patch from monorepo SOURCE, not published
// packages, so a change in any lib is reflected immediately here:
//   react-hooks-global-states-debug -> libs/monkey_patch/src (the side-effect debug entry)
//   react-global-state-hooks         -> libs/web/src
//   react-hooks-global-states        -> libs/universal/src
// Deep-subpath aliases must precede the bare-name aliases so they win for subpath imports.
const monkeyPatchSrc = path.resolve(__dirname, '../../libs/monkey_patch/src');
const webSrc = path.resolve(__dirname, '../../libs/web/src');
const universalSrc = path.resolve(__dirname, '../../libs/universal/src');

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5199,
  },
  resolve: {
    alias: [
      // The debug package is a side-effect import; its source entry is src/debug.ts.
      { find: /^react-hooks-global-states-debug$/, replacement: `${monkeyPatchSrc}/debug.ts` },
      { find: /^react-global-state-hooks\/(.*)$/, replacement: `${webSrc}/$1` },
      { find: /^react-global-state-hooks$/, replacement: `${webSrc}/index.ts` },
      { find: /^react-hooks-global-states\/(.*)$/, replacement: `${universalSrc}/$1` },
      { find: /^react-hooks-global-states$/, replacement: `${universalSrc}/index.ts` },
    ],
    // Resolve extensionless TS subpath aliases (e.g. react-hooks-global-states/uniqueId).
    extensions: ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json'],
  },
});
