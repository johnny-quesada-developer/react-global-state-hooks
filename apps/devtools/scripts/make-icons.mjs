#!/usr/bin/env node
/**
 * Converts the author's illustrated avatar (public/icon.jpeg, an opaque JPEG on white) into the extension's
 * icon files: the SAME file names, format and size the previous icon used (PNG data, 102x102, named .ico).
 * Nothing is redrawn: the pixels come from icon.jpeg. The white background is removed (only white connected
 * to the image border, so the white of the teeth and the glasses highlights stays) and the edge is decontaminated.
 *
 *   node scripts/make-icons.mjs
 *
 * Writes:
 *   src/assets/devtools_page_icon.ico       102x102 PNG (manifest 128px icon)
 *   src/assets/devtools_page_icon-28px.ico  102x102 PNG (manifest 16px icon and the panel icon), same as before
 *   ../website/public/img/devtools-logo.png 512x512 transparent PNG for the site
 * The original monkey icon is kept at src/assets/original/monkey_icon.ico.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(here, '../../../public/icon.jpeg');
const assets = path.resolve(here, '../src/assets');
const website = path.resolve(here, '../../website/public/img');

const WHITE_DISTANCE = 30; // how far from pure white a border-connected pixel may be and still count as background

const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;
const at = (x, y) => (y * width + x) * 4;
const distanceFromWhite = (i) => Math.max(255 - data[i], 255 - data[i + 1], 255 - data[i + 2]);

// 1. background = near-white pixels connected to the border
const background = new Uint8Array(width * height);
const queue = [];
const push = (x, y) => {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const p = y * width + x;
  if (background[p] || distanceFromWhite(at(x, y)) > WHITE_DISTANCE) return;
  background[p] = 1;
  queue.push(p);
};
for (let x = 0; x < width; x++) {
  push(x, 0);
  push(x, height - 1);
}
for (let y = 0; y < height; y++) {
  push(0, y);
  push(width - 1, y);
}
while (queue.length) {
  const p = queue.pop();
  const x = p % width;
  const y = (p - x) / width;
  push(x + 1, y);
  push(x - 1, y);
  push(x, y + 1);
  push(x, y - 1);
}

// 2. alpha: background 0, foreground 255, and a soft edge on foreground pixels touching the background
const out = Buffer.from(data);
const touchesBackground = (x, y) => {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < width && ny < height && background[ny * width + nx]) return true;
    }
  }
  return false;
};

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = at(x, y);
    if (background[y * width + x]) {
      out[i + 3] = 0;
      continue;
    }

    let alpha = 1;
    if (touchesBackground(x, y)) {
      // whiteness of the pixel: a JPEG edge pixel is a blend of the artwork and white
      const whiteness = Math.min(data[i], data[i + 1], data[i + 2]) / 255;
      alpha = Math.min(1, Math.max(0, (1 - whiteness) / 0.2));
      // remove the white that was blended in
      for (let c = 0; c < 3; c++) {
        out[i + c] = alpha > 0 ? Math.max(0, Math.min(255, Math.round((data[i + c] - 255 * (1 - alpha)) / alpha))) : 0;
      }
    }
    out[i + 3] = Math.round(alpha * 255);
  }
}

// 3. crop to the artwork, square canvas with a small margin
const cutout = await sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
const trimmed = await sharp(cutout).trim({ threshold: 1 }).toBuffer();
const { width: tw, height: th } = await sharp(trimmed).metadata();
const side = Math.round(Math.max(tw, th) * 1.06);
const square = await sharp(trimmed)
  .extend({
    top: Math.floor((side - th) / 2),
    bottom: Math.ceil((side - th) / 2),
    left: Math.floor((side - tw) / 2),
    right: Math.ceil((side - tw) / 2),
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();

const render = (size) => sharp(square).resize(size, size, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toBuffer();

const icon = await render(102);
fs.writeFileSync(path.join(assets, 'devtools_page_icon.ico'), icon);
fs.writeFileSync(path.join(assets, 'devtools_page_icon-28px.ico'), icon);

fs.mkdirSync(website, { recursive: true });
fs.writeFileSync(path.join(website, 'devtools-logo.png'), await render(512));
fs.writeFileSync(path.join(website, 'avatar-head.png'), await render(128));

console.log('[make-icons] wrote devtools_page_icon.ico, devtools_page_icon-28px.ico (102x102) and website devtools-logo.png / avatar-head.png');
