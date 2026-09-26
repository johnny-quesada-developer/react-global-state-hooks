import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');

const token = (name: string): string => {
  const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`token --color-${name} not found`);
  return match[1];
};

const channel = (value: number) => {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [foreground, background, minimum ratio]. 4.5 = WCAG AA body text, 3 = AA for large text / UI.
const pairs: [string, string, number][] = [
  ['ink', 'paper', 4.5],
  ['ink', 'soft', 4.5],
  ['ink', 'green-soft', 4.5],
  ['ink', 'blue-soft', 4.5],
  ['muted', 'paper', 4.5],
  ['muted', 'soft', 4.5],
  ['muted', 'surface', 4.5],
  ['green', 'paper', 4.5],
  ['green', 'green-soft', 4.5],
  ['green', 'soft', 4.5],
  ['blue', 'paper', 4.5],
  ['blue', 'blue-soft', 4.5],
  ['amber', 'amber-soft', 4.5],
  ['red', 'red-soft', 4.5],
  ['red', 'paper', 4.5],
  ['terminal-text', 'terminal', 4.5],
  ['terminal-muted', 'terminal', 4.5],
  ['paper', 'ink', 4.5],
  ['green', 'paper', 3],
];

describe('design token contrast', () => {
  it.each(pairs)('%s on %s meets %s:1', (fg, bg, min) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(min);
  });
});
