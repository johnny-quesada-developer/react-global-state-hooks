import { rgshLight } from './shiki-theme.mjs';
import { contrast } from './contrast';

const background = rgshLight.colors['editor.background'];

const colours = [
  ...new Set(rgshLight.tokenColors.map((rule) => rule.settings.foreground).filter(Boolean)),
  rgshLight.colors['editor.foreground'],
];

describe('code theme contrast', () => {
  it.each(colours)('%s on the code background meets 4.5:1', (colour) => {
    expect(contrast(colour as string, background)).toBeGreaterThanOrEqual(4.5);
  });
});
