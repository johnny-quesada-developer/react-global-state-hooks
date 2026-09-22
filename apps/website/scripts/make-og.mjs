#!/usr/bin/env node
/**
 * Generates the 1200x630 share thumbnails in public/og/ from page titles.
 *
 *   node scripts/make-og.mjs
 *
 * Titles and descriptions come from the docs/examples frontmatter, so a new page only needs to re-run this
 * script. The PNGs are committed: CI does not regenerate them, so the build never depends on installed fonts.
 * Rendered with sharp (SVG -> PNG) using the site palette on a white background.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = path.join(root, 'public/og');

const color = {
  bg: '#ffffff',
  text: '#20332d',
  muted: '#4a5f57',
  primary: '#24634b',
  mint: '#e4f2e8',
  sky: '#e5f2fa',
  yellow: '#fff0b8',
};
const FONT = 'Helvetica Neue, Helvetica, Arial, sans-serif';

const escape = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Greedy word wrap using an average glyph width; good enough for short titles. */
function wrap(text, fontSize, maxWidth, maxLines) {
  const perLine = Math.floor(maxWidth / (fontSize * 0.54));
  const lines = [];
  let line = '';

  for (const word of text.split(/\s+/)) {
    if ((line + ' ' + word).trim().length > perLine) {
      lines.push(line);
      line = word;
    } else {
      line = (line + ' ' + word).trim();
    }
  }
  if (line) lines.push(line);

  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1].replace(/[\s.,;:]*$/, '') + '…';
    return kept;
  }
  return lines;
}

function svg({ kicker, title, description }) {
  const titleLines = wrap(title, 68, 1040, 3);
  const descLines = wrap(description, 30, 1040, titleLines.length > 2 ? 1 : 2);
  const titleY = 284;
  const descY = titleY + (titleLines.length - 1) * 78 + 62;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${color.bg}"/>
  <rect x="0" y="574" width="400" height="56" fill="${color.mint}"/>
  <rect x="400" y="574" width="400" height="56" fill="${color.sky}"/>
  <rect x="800" y="574" width="400" height="56" fill="${color.yellow}"/>
  <g transform="translate(80 84)">
    <rect width="64" height="64" rx="16" fill="${color.primary}"/>
    <circle cx="20" cy="22" r="6" fill="${color.yellow}"/>
    <circle cx="44" cy="22" r="6" fill="${color.mint}"/>
    <circle cx="32" cy="44" r="6" fill="${color.sky}"/>
    <path d="M20 22 L44 22 L32 44 Z" fill="none" stroke="#ffffff" stroke-width="2.8" stroke-linejoin="round"/>
  </g>
  <text x="164" y="128" font-family="${FONT}" font-size="34" font-weight="700" fill="${color.text}">react-global-state-hooks</text>
  <text x="80" y="206" font-family="${FONT}" font-size="26" font-weight="700" fill="${color.primary}" letter-spacing="1.5">${escape(kicker.toUpperCase())}</text>
  ${titleLines.map((line, i) => `<text x="80" y="${titleY + i * 78}" font-family="${FONT}" font-size="68" font-weight="700" fill="${color.text}">${escape(line)}</text>`).join('\n  ')}
  ${descLines.map((line, i) => `<text x="80" y="${descY + i * 40}" font-family="${FONT}" font-size="30" fill="${color.muted}">${escape(line)}</text>`).join('\n  ')}
</svg>`;
}

function frontmatter(file) {
  const text = fs.readFileSync(file, 'utf8');
  const block = text.match(/^---\n([\s\S]*?)\n---/)[1];
  const get = (key) => block.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1].trim();

  return { title: get('title'), description: get('description'), section: get('section') };
}

const pages = [
  {
    file: 'home',
    kicker: 'React state management',
    title: 'Shared React state that works like useState',
    description: 'One call to create a store. Selectors, actions and localStorage built in.',
  },
  {
    file: 'docs',
    kicker: 'Documentation',
    title: 'react-global-state-hooks documentation',
    description: 'Guides and reference for stores, selectors, actions, context and persistence.',
  },
  {
    file: 'examples',
    kicker: 'Examples',
    title: 'Working examples with live demos',
    description: 'Task list, async loading and retry, persistence and scoped state, with tested source.',
  },
  {
    file: 'about',
    kicker: 'About the author',
    title: 'Johnny Quesada',
    description: 'Senior product engineer. Case studies, engineering approach and open-source work.',
  },
  {
    file: 'easy-code-review',
    kicker: 'Beta',
    title: 'easy-code-review',
    description: 'Automated coverage and custom code reviews, with measured results and focused retries.',
  },
];

for (const [dir, kind] of [
  ['docs', 'Documentation'],
  ['examples', 'Example'],
]) {
  const folder = path.join(root, 'src/content', dir);

  for (const name of fs.readdirSync(folder).filter((entry) => entry.endsWith('.mdx'))) {
    const { title, description, section } = frontmatter(path.join(folder, name));
    pages.push({ file: `${dir}/${name.replace(/\.mdx$/, '')}`, kicker: section ?? kind, title, description });
  }
}

fs.mkdirSync(path.join(out, 'docs'), { recursive: true });
fs.mkdirSync(path.join(out, 'examples'), { recursive: true });

for (const page of pages) {
  await sharp(Buffer.from(svg(page)))
    .png({ compressionLevel: 9, palette: true })
    .toFile(path.join(out, `${page.file}.png`));
}

console.log(`[make-og] wrote ${pages.length} images to public/og`);
