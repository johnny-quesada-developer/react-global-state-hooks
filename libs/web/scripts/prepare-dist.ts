/**
 * Copies the files needed to publish into ./dist so that `npm publish` can be run
 * from inside ./dist. Publishing from ./dist keeps the published package layout flat
 * (files sit next to the copied package.json) and avoids polluting the repo root with
 * build artifacts.
 *
 * The package.json is copied as-is: its `exports`/`main`/`module`/`types` paths are
 * already relative (e.g. "./uniqueId.mjs") and resolve correctly next to the emitted
 * files inside ./dist. A few dev-only fields are stripped from the published copy.
 *
 * Run with: tsx scripts/prepare-dist.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const root = path.resolve(__dirname, '..');
const dist = path.resolve(root, 'dist');

if (!fs.existsSync(dist)) {
  console.error('dist/ does not exist. Run the build first.');
  process.exit(1);
}

// --- package.json (strip dev-only fields, keep everything consumers rely on) ---
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as Record<string, unknown>;

delete pkg.devDependencies;
delete pkg.scripts;
// `files` is unnecessary when publishing from dist (dist only contains what we put there),
// but keeping it is harmless and still accurate.

fs.writeFileSync(path.join(dist, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);

// --- static files ---
for (const file of ['README.md', 'LICENSE']) {
  const from = path.join(root, file);
  if (fs.existsSync(from)) {
    fs.copyFileSync(from, path.join(dist, file));
  }
}

console.log('Prepared dist/ for publishing.');
