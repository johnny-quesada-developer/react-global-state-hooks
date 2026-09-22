#!/usr/bin/env node
/**
 * Regenerates derived raster assets from the originals in the repository-root /public with ffmpeg.
 * Originals are never modified.
 *
 *   node scripts/make-assets.mjs
 *
 *   <root>/public/intro.landscape.1080p.mp4     1920x1080 30fps rendition of intro.landscape.mp4 (served)
 *   <root>/public/intro.mobile.1080p.mp4        1080x1920 30fps rendition of intro.mobile.mp4 (served)
 *   <root>/public/runtime-debugging.{landscape,mobile}.1080p.mp4   1080p30 renditions (served)
 *   <root>/public/verify-the-fix.{landscape,mobile}.1080p.mp4      1080p30 renditions (served)
 *   public/posters/intro.landscape.jpg   1280x720 frame at POSTER_SECOND of intro.landscape.mp4
 *   public/posters/intro.mobile.jpg      720x1280 frame at POSTER_SECOND of intro.mobile.mp4
 *   public/posters/runtime-debugging.{landscape,mobile}.jpg   frame at 15s (the runtime-trace beat)
 *   public/posters/verify-the-fix.{landscape,mobile}.jpg      frame at 38s (the VERIFIED beat)
 *
 *   agentic.landscape/mobile.mp4 are retired from the site (replaced by runtime-debugging and
 *   verify-the-fix); their masters stay in the repo root but are no longer derived or served.
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
  ['intro.landscape.1080p.mp4', 'intro.landscape.jpg', 'scale=1280:720:flags=lanczos', POSTER_SECOND],
  ['intro.mobile.1080p.mp4', 'intro.mobile.jpg', 'scale=720:1280:flags=lanczos', POSTER_SECOND],
  [
    'runtime-debugging.landscape.1080p.mp4',
    'runtime-debugging.landscape.jpg',
    'scale=1280:720:flags=lanczos',
    15,
  ],
  ['runtime-debugging.mobile.1080p.mp4', 'runtime-debugging.mobile.jpg', 'scale=720:1280:flags=lanczos', 15],
  ['verify-the-fix.landscape.1080p.mp4', 'verify-the-fix.landscape.jpg', 'scale=1280:720:flags=lanczos', 38],
  ['verify-the-fix.mobile.1080p.mp4', 'verify-the-fix.mobile.jpg', 'scale=720:1280:flags=lanczos', 38],
];

const renditions = [
  ['intro.landscape.mp4', 'intro.landscape.1080p.mp4', 'scale=1920:1080:flags=lanczos'],
  ['intro.mobile.mp4', 'intro.mobile.1080p.mp4', 'scale=1080:1920:flags=lanczos'],
  ['runtime-debugging.landscape.mp4', 'runtime-debugging.landscape.1080p.mp4', 'scale=1920:1080:flags=lanczos'],
  ['runtime-debugging.mobile.mp4', 'runtime-debugging.mobile.1080p.mp4', 'scale=1080:1920:flags=lanczos'],
  ['verify-the-fix.landscape.mp4', 'verify-the-fix.landscape.1080p.mp4', 'scale=1920:1080:flags=lanczos'],
  ['verify-the-fix.mobile.mp4', 'verify-the-fix.mobile.1080p.mp4', 'scale=1080:1920:flags=lanczos'],
];

for (const [source, rendition, filter] of renditions) {
  const from = path.join(rootPublic, source);
  const to = path.join(rootPublic, rendition);

  if (fs.existsSync(to) && fs.statSync(to).mtimeMs >= fs.statSync(from).mtimeMs) continue;

  ffmpeg([
    '-i',
    from,
    '-vf',
    filter,
    '-r',
    '30',
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '21',
    '-pix_fmt',
    'yuv420p',
    '-profile:v',
    'high',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-movflags',
    '+faststart',
    to,
  ]);
}

for (const [video, poster, filter, second] of posters) {
  ffmpeg([
    '-ss',
    String(second),
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
