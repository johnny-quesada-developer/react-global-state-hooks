/**
 * Last step of `yarn build`: turns the raw `dist/` (bundled JS + emitted .d.ts) into a
 * publish-ready package directory — a stripped package.json (no devDependencies/scripts) plus
 * README/LICENSE, mirroring the pattern already used by libs/web, libs/universal, libs/mobile.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');
const distDir = path.join(packageRoot, 'dist');

if (!fs.existsSync(distDir)) {
  console.error('[prepare-dist] dist/ does not exist. Run the build first.');
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
delete packageJson.devDependencies;
delete packageJson.scripts;

// The source package.json points at "./dist/..." (correct for the monorepo's own workspace
// symlink, which resolves against the package root). Once this copy sits INSIDE dist/ itself —
// which is what gets packed/published — every one of those paths must drop the "dist/" prefix
// to still point at the right sibling file.
const stripDistPrefix = (value: unknown): unknown =>
  typeof value === 'string'
    ? value.replace(/^\.\/dist\//, './')
    : Array.isArray(value)
      ? value.map(stripDistPrefix)
      : value && typeof value === 'object'
        ? Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, stripDistPrefix(entry)]))
        : value;

for (const field of ['bin', 'main', 'module', 'types', 'exports']) {
  if (field in packageJson) packageJson[field] = stripDistPrefix(packageJson[field]);
}

fs.writeFileSync(path.join(distDir, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`);

for (const file of ['README.md', 'LICENSE']) {
  const source = path.join(packageRoot, file);
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(distDir, file));
}

console.log('[prepare-dist] Prepared dist/ for publishing.');
