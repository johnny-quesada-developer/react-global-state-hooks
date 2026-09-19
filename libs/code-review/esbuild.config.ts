/**
 * Build script for the `code-review` package. Produces a clean ESM `dist/`: `cli.js` (the
 * executable CLI, `bin`) and `index.js` (the public API). Real npm dependencies (langgraph,
 * clack, minimatch, zod, typescript, jiti) are kept external — only this package's own source is
 * bundled. No UMD/CJS: the package is `"type": "module"`.
 *
 * Run with: tsx esbuild.config.ts
 */
import * as esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const bareExternals = ['@langchain/langgraph', '@langchain/core', '@clack/prompts', 'minimatch', 'zod', 'typescript', 'jiti'];

const shared: esbuild.BuildOptions = {
  bundle: true,
  platform: 'node',
  target: ['node18'],
  format: 'esm',
  sourcemap: false,
  minify: false,
  external: bareExternals,
  absWorkingDir: __dirname,
};

async function build() {
  await esbuild.build({
    ...shared,
    entryPoints: { cli: 'src/cli.ts' },
    outdir: 'dist',
    banner: { js: '#!/usr/bin/env node' },
  });
  await esbuild.build({
    ...shared,
    entryPoints: { index: 'src/index.ts' },
    outdir: 'dist',
  });
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
