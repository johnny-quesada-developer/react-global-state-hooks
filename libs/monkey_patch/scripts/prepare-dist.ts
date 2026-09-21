/**
 * Copies the files needed to publish into ./dist so `npm publish` can run from inside ./dist.
 * Mirrors the original build (which copied package.json + index.d.ts next to the bundled
 * debug.js). Dev-only package.json fields are stripped from the published copy.
 *
 * Run with: tsx scripts/prepare-dist.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.resolve(root, 'dist');

for (const built of ['debug.js', 'cli.mjs']) {
  if (!fs.existsSync(path.join(dist, built))) {
    console.error(`dist/${built} not found. Run the esbuild build first.`);
    process.exit(1);
  }
}

// package.json (strip dev-only fields; the published paths already sit next to debug.js).
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as Record<string, unknown>;
delete pkg.devDependencies;
delete pkg.scripts;
fs.writeFileSync(path.join(dist, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);

// Hand-authored ambient type declaration for the side-effect package.
fs.copyFileSync(path.join(root, 'src', 'index.d.ts'), path.join(dist, 'index.d.ts'));

// Static files if present.
for (const file of ['README.md', 'LICENSE']) {
  const from = path.join(root, file);
  if (fs.existsSync(from)) fs.copyFileSync(from, path.join(dist, file));
}

console.log('Prepared dist/ for publishing.');
