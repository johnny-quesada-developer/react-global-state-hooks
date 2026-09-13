/**
 * Build script for react-hooks-global-states.
 *
 * Produces a clean dual-format package. For every entry point we emit:
 *   - <name>.mjs  -> native ES module   (export const x; export default x)
 *   - <name>.cjs  -> clean CommonJS      (exports.x = x; exports.default = x; __esModule)
 *   - <name>.js   -> clean CommonJS      (identical to .cjs, kept for backward compatibility
 *                                         with the previous `main`/exports that pointed at *.js)
 *
 * NO UMD is emitted. The old UMD wrapper (webpack libraryTarget: 'umd') is what broke
 * esbuild-based runtimes (tsx, Vite dev, Bun): its `this[...] = factory(...)` global-assignment
 * branch confused esbuild's CJS export detection, producing phantom named exports and a
 * non-callable default. Native ESM + clean CJS interops everywhere.
 *
 * Cross-subpath imports (e.g. GlobalStore importing ./uniqueId) are kept EXTERNAL so the
 * module graph matches the previous webpack build (no code duplicated across subpaths).
 * esbuild rewrites those specifiers to the correct extension per format via plugins.
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
  // internal module imported by GlobalStore (kept as a sibling file, not a public subpath)
  'GlobalStore.debugProps': 'src/GlobalStore.debugProps.ts',
  createGlobalState: 'src/createGlobalState.ts',
  types: 'src/types.ts',
  isRecord: 'src/isRecord.ts',
  shallowCompare: 'src/shallowCompare.ts',
  throwWrongKeyOnActionCollectionConfig: 'src/throwWrongKeyOnActionCollectionConfig.ts',
  uniqueId: 'src/uniqueId.ts',
  actions: 'src/actions.ts',
};

// bare-module externals: never bundle these.
// react / react-dom are peer dependencies. json-storage-formatter is a runtime dependency
// that now ships a clean dual ESM/CJS format (>=4.0.0-beta), so it interops correctly under
// native ESM and can safely stay external (deduped/shared instead of duplicated per subpath).
const bareExternals = ['react', 'react-dom', 'json-storage-formatter', 'json-storage-formatter/*'];

const outdir = path.resolve(__dirname, 'dist');

/**
 * esbuild plugin that keeps relative sibling imports (./uniqueId, ./GlobalStore, ...) external
 * and rewrites their extension to match the current output format. This mirrors the old
 * webpack behavior where each subpath referenced its siblings as separate files instead of
 * inlining them.
 */
const relativeSiblingExternal = (extension: string): esbuild.Plugin => ({
  name: 'relative-sibling-external',
  setup(build) {
    build.onResolve({ filter: /^\.\// }, (args) => {
      // Never externalize the entry points themselves.
      if (args.kind === 'entry-point') return null;

      // Treat relative sibling imports (./uniqueId, ./GlobalStore, ...) as external and
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
  // Minify the published output (matches the pre-dual-output webpack build).
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
  // Kept so the previous `main: ./bundle.js` and any deep `require('.../<name>.js')`
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
