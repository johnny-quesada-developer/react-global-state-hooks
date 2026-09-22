/**
 * Build for react-hooks-global-states-debug (the "monkey patch").
 *
 * Replaces the previous webpack build (webpack.config.monkey_patch.cjs). It produces a single,
 * SELF-CONTAINED ESM bundle at dist/debug.js from the side-effect entry src/debug.ts.
 *
 * The monkey patch is injected into a running page, so it bundles ALL of its dependencies (no
 * externals) — including the handful of runtime values it pulls from the base library
 * (`uniqueId`, `isRecord`) plus `zod`, `json-storage-formatter` and `easy-cancelable-promise`.
 * The base library is referenced as `react-global-state-hooks`; in the monorepo that name is
 * resolved to the web variant's SOURCE (libs/web/src) via the alias plugin below, so we bundle
 * the local code rather than a published package. Type-only base imports (BaseMetadata,
 * AnyFunction, GlobalStore) erase at build time.
 *
 * Run with: tsx esbuild.config.ts   (add --dev for an unminified, source-mapped build)
 */
import * as esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.argv.includes('--dev');

const webSrc = path.resolve(__dirname, '../web/src');
const universalSrc = path.resolve(__dirname, '../universal/src');

/** Map a base-library import specifier to a source directory, resolving to index.ts for the bare
 *  name and appending the .ts extension for subpaths that lack one. */
function toSource(baseName: string, srcDir: string, specifier: string): string {
  const sub = specifier.slice(baseName.length).replace(/^\//, '');
  if (!sub) return path.join(srcDir, 'index.ts');
  return /\.[a-z]+$/.test(sub) ? path.join(srcDir, sub) : path.join(srcDir, `${sub}.ts`);
}

/**
 * Resolve the base library names to local SOURCE, mirroring the vitest alias so build and tests
 * agree. `react-global-state-hooks` -> libs/web/src; web's source re-exports from
 * `react-hooks-global-states` -> libs/universal/src.
 */
const baseLibraryAlias: esbuild.Plugin = {
  name: 'react-global-state-hooks-source-alias',
  setup(build) {
    build.onResolve({ filter: /^react-global-state-hooks(\/.*)?$/ }, (args) => ({
      path: toSource('react-global-state-hooks', webSrc, args.path),
    }));
    build.onResolve({ filter: /^react-hooks-global-states(\/.*)?$/ }, (args) => ({
      path: toSource('react-hooks-global-states', universalSrc, args.path),
    }));
  },
};

const debugBuild = esbuild.build({
    entryPoints: { debug: path.resolve(__dirname, 'src/debug.ts') },
    outdir: path.resolve(__dirname, 'dist'),
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2020'],
    minify: !isDev,
    sourcemap: isDev ? 'inline' : false,
    logLevel: 'info',
    define: {
      'process.env.NODE_ENV': JSON.stringify(isDev ? 'development' : 'production'),
    },
    // Resolve bare TS subpath imports (json-storage-formatter/isNil, etc.) with these extensions.
    resolveExtensions: ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json'],
    plugins: [baseLibraryAlias],
  });

const cliBuild = esbuild.build({
  entryPoints: { cli: path.resolve(__dirname, 'src/cli/main.ts') },
  outdir: path.resolve(__dirname, 'dist'),
  outExtension: { '.js': '.mjs' },
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: ['node20'],
  external: ['ws'],
  logLevel: 'info',
});

Promise.all([debugBuild, cliBuild]).catch((err) => {
  console.error(err);
  process.exit(1);
});
