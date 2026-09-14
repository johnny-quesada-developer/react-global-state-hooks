/**
 * Build script for react-native-global-state-hooks.
 *
 * Produces a clean dual-format package. For every entry point we emit:
 *   - <name>.mjs  -> native ES module   (export const x; export default x)
 *   - <name>.cjs  -> clean CommonJS      (exports.x = x; exports.default = x; __esModule)
 *   - <name>.js   -> clean CommonJS      (identical to .cjs, kept for backward compatibility
 *                                         with the previous UMD `main`/exports that pointed at *.js)
 *
 * This replaces the previous webpack UMD build. The UMD wrapper's global-assignment branch
 * confused esbuild-based runtimes (tsx, Vite dev, Bun); native ESM + clean CJS interops
 * everywhere. This mirrors the esbuild setup already used by the web and universal packages.
 *
 * This package is a thin consumer/extension of react-hooks-global-states. That base package is
 * kept EXTERNAL so it resolves at the consumer as a normal dependency (not duplicated here).
 * react-native and @react-native-async-storage/async-storage are peers, and
 * json-storage-formatter is a runtime dependency imported directly; all are kept external so the
 * module graph stays split and deps are deduped/shared.
 *
 * Cross-subpath imports (e.g. GlobalStore importing ./tryCatch) are kept EXTERNAL so the module
 * graph stays split (no code duplicated across subpaths). esbuild rewrites those specifiers to
 * the correct extension per format via a small onResolve plugin.
 *
 * Run with: tsx esbuild.config.ts
 */
import * as esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const entryPoints: Record<string, string> = {
  bundle: 'src/index.ts',
  createContext: 'src/createContext.ts',
  GlobalStore: 'src/GlobalStore.ts',
  createGlobalState: 'src/createGlobalState.ts',
  types: 'src/types.ts',
  isRecord: 'src/isRecord.ts',
  shallowCompare: 'src/shallowCompare.ts',
  throwWrongKeyOnActionCollectionConfig: 'src/throwWrongKeyOnActionCollectionConfig.ts',
  uniqueId: 'src/uniqueId.ts',
  actions: 'src/actions.ts',
  // react-native specific public subpath
  asyncStorageWrapper: 'src/asyncStorageWrapper.ts',
  // internal modules imported by GlobalStore (kept as sibling files, not public subpaths)
  tryCatch: 'src/tryCatch.ts',
  isPromise: 'src/isPromise.ts',
};

// bare-module externals: never bundle these.
// react / react-native / async-storage are peer dependencies. react-hooks-global-states is the
// base package this package extends; it must resolve at the consumer, not be inlined here.
// json-storage-formatter is a runtime dependency imported directly by GlobalStore.ts.
const bareExternals = [
  'react',
  'react-dom',
  'react-native',
  '@react-native-async-storage/async-storage',
  'react-hooks-global-states',
  'react-hooks-global-states/*',
  'json-storage-formatter',
  'json-storage-formatter/*',
];

const outdir = path.resolve(__dirname, 'dist');

/**
 * esbuild plugin that keeps relative sibling imports (./tryCatch, ./GlobalStore, ...) external
 * and rewrites their extension to match the current output format. This mirrors the previous
 * webpack behavior where each subpath referenced its siblings as separate files instead of
 * inlining them.
 */
const relativeSiblingExternal = (extension: string): esbuild.Plugin => ({
  name: 'relative-sibling-external',
  setup(build) {
    build.onResolve({ filter: /^\.\// }, (args) => {
      // Never externalize the entry points themselves.
      if (args.kind === 'entry-point') return null;

      // Treat relative sibling imports (./tryCatch, ./GlobalStore, ...) as external and
      // re-point them to the emitted sibling file for the current output format.
      const withoutExt = args.path.replace(/\.(ts|js|mjs|cjs)$/, '');
      return {
        path: `${withoutExt}${extension}`,
        external: true,
      };
    });
  },
});

const shared: esbuild.BuildOptions = {
  entryPoints,
  outdir,
  bundle: true,
  platform: 'neutral',
  target: ['es2017'],
  // No sourcemaps in the published output: they would reference ../src which is not shipped.
  sourcemap: false,
  logLevel: 'info',
  // Minify the published output (restores parity with the pre-esbuild webpack/terser build).
  minify: true,
  external: bareExternals,
};

async function build(): Promise<void> {
  // ESM build -> .mjs, sibling imports point to ./*.mjs
  await esbuild.build({
    ...shared,
    format: 'esm',
    outExtension: { '.js': '.mjs' },
    plugins: [relativeSiblingExternal('.mjs')],
  });

  // CJS build -> .cjs, sibling imports point to ./*.cjs
  await esbuild.build({
    ...shared,
    format: 'cjs',
    outExtension: { '.js': '.cjs' },
    plugins: [relativeSiblingExternal('.cjs')],
  });

  // Legacy CJS build -> .js, sibling imports point to ./*.js
  // Kept so the previous UMD `main: ./bundle.js` and any deep `require('.../<name>.js')`
  // references from already-published consumers keep resolving to clean CJS.
  await esbuild.build({
    ...shared,
    format: 'cjs',
    outExtension: { '.js': '.js' },
    plugins: [relativeSiblingExternal('.js')],
  });
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
