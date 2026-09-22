#!/usr/bin/env node
/**
 * Copies the site's videos from the repository-root /public into apps/website/public/media so
 * Astro serves them under the site base path. Every video is served from its 1080p rendition (see
 * make-assets.mjs); the higher-resolution master stays in the root only. The copies are git-ignored; the
 * root files stay the single source of truth. Skips files whose size already matches.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(here, '../../../public');
const target = path.resolve(here, '../public/media');
const files = [
  ['intro.landscape.1080p.mp4', 'intro.landscape.mp4'],
  ['intro.mobile.1080p.mp4', 'intro.mobile.mp4'],
  ['runtime-debugging.landscape.1080p.mp4', 'runtime-debugging.landscape.mp4'],
  ['runtime-debugging.mobile.1080p.mp4', 'runtime-debugging.mobile.mp4'],
  ['verify-the-fix.landscape.1080p.mp4', 'verify-the-fix.landscape.mp4'],
  ['verify-the-fix.mobile.1080p.mp4', 'verify-the-fix.mobile.mp4'],
];

fs.mkdirSync(target, { recursive: true });

for (const [name, served] of files) {
  const from = path.join(source, name);
  const to = path.join(target, served);

  if (!fs.existsSync(from)) {
    console.error(`[sync-media] missing ${from}`);
    process.exit(1);
  }

  if (fs.existsSync(to) && fs.statSync(to).size === fs.statSync(from).size) continue;

  fs.copyFileSync(from, to);
  console.log(`[sync-media] copied ${served}`);
}
