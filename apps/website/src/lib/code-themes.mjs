/**
 * The code themes a visitor can pick from. Every highlighted block carries one CSS variable per
 * theme (--sh-<id>), so switching is a data attribute on <html>, not a rebuild.
 * The surface colours below mirror each theme's own editor background and chrome.
 */
import lightPlus from 'shiki/themes/light-plus.mjs';
import darkPlus from 'shiki/themes/dark-plus.mjs';
import { rgshLight } from './shiki-theme.mjs';

export const CODE_THEMES = [
  { id: 'vscode-light', label: 'VS Code Light', theme: lightPlus },
  { id: 'vscode-dark', label: 'VS Code Dark', theme: darkPlus },
  { id: 'rgsh', label: 'Site palette', theme: rgshLight },
];

export const DEFAULT_CODE_THEME = 'vscode-light';

export const CODE_THEME_IDS = CODE_THEMES.map((entry) => entry.id);

/** { id: theme } for Shiki's multi-theme output. */
export const shikiThemes = Object.fromEntries(CODE_THEMES.map((entry) => [entry.id, entry.theme]));

export const CSS_VARIABLE_PREFIX = '--sh-';
