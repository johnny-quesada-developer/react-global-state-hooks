/**
 * Emit ESM (.mjs), CommonJS (.cjs) and legacy .js entries.
 * Keep dependencies and sibling modules external to preserve shared instances.
 * Packaging details: ../../ARCHITECTURE.md.
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
  // Keep the opt-in debug package external.
  debug: 'src/debug.ts',
};

// Resolve runtime dependencies from the consumer’s installation.
const bareExternals = [
  'react',
  'react-dom',
  'json-storage-formatter',
  'json-storage-formatter/*',
  'react-hooks-global-states-debug',
  'react-hooks-global-states-debug/*',
];

const outdir = path.resolve(__dirname, 'dist');

/** Keep sibling imports external and match their extension to the output format. */
const relativeSiblingExternal = (extension: string): esbuild.Plugin => ({
  name: 'relative-sibling-external',
  setup(build) {
    build.onResolve({ filter: /^\.\// }, (args) => {
      // Never externalize the entry points themselves.
      if (args.kind === 'entry-point') return null;

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
  minify: true,
  external: bareExternals,
};

async function build(): Promise<void> {
  await esbuild.build({
    ...shared,
    format: 'esm',
    outExtension: { '.js': '.mjs' },
    plugins: [relativeSiblingExternal('.mjs')],
  });

  await esbuild.build({
    ...shared,
    format: 'cjs',
    outExtension: { '.js': '.cjs' },
    plugins: [relativeSiblingExternal('.cjs')],
  });

  // Preserve legacy deep imports ending in .js.
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
