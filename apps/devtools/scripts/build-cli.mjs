// Bundles the rgsh CLI (Node target) into dist-cli/rgsh.mjs. Kept apart from the extension build:
// the browser bundles never import from src/cli, and `ws` stays an external runtime dependency.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

await build({
  entryPoints: [`${root}src/cli/main.ts`],
  outfile: `${root}dist-cli/rgsh.mjs`,
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  packages: 'external',
  logLevel: 'info',
});
