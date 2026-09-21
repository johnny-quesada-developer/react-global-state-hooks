#!/usr/bin/env node
/**
 * Regenerates derived raster assets from the originals in the repository-root /public with ffmpeg.
 * Originals are never modified.
 *
 *   node scripts/make-assets.mjs
 *
 *   public/posters/intro.landscape.jpg   1280x720 frame at POSTER_SECOND of intro.landscape.mp4
 *   public/posters/intro.mobile.jpg      720x1280 frame at POSTER_SECOND of intro.mobile.mp4
 *   public/img/johnny-{256,512}.png      downscaled copies of johnny-profile-transparent.png
 *                                        (alpha preserved, no retouching)
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const rootPublic = path.resolve(here, '../../../public');
const out = path.resolve(here, '../public');
const POSTER_SECOND = 10;

function ffmpeg(args) {
  const result = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error('[make-assets] ffmpeg failed');
    process.exit(result.status ?? 1);
  }
}

fs.mkdirSync(path.join(out, 'posters'), { recursive: true });
fs.mkdirSync(path.join(out, 'img'), { recursive: true });

const posters = [
  ['intro.landscape.mp4', 'intro.landscape.jpg', 'scale=1280:720:flags=lanczos'],
  ['intro.mobile.mp4', 'intro.mobile.jpg', 'scale=720:1280:flags=lanczos'],
];

for (const [video, poster, filter] of posters) {
  ffmpeg([
    '-ss',
    String(POSTER_SECOND),
    '-i',
    path.join(rootPublic, video),
    '-frames:v',
    '1',
    '-vf',
    filter,
    '-q:v',
    '3',
    path.join(out, 'posters', poster),
  ]);
}

for (const size of [256, 512]) {
  ffmpeg([
    '-i',
    path.join(rootPublic, 'johnny-profile-transparent.png'),
    '-vf',
    `scale=${size}:-1:flags=lanczos`,
    path.join(out, 'img', `johnny-${size}.png`),
  ]);
}

console.log('[make-assets] done');
