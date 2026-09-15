import type { Config } from 'tailwindcss';

/**
 * Single source of truth for the project's Tailwind theme customizations.
 *
 * Consumed by:
 *   - tailwind.config.ts (theme.extend)
 *   - src/shared/tools/twMerge.ts (so tailwind-merge knows our custom scales and
 *     doesn't drop custom classes like `text-xxs` when merging)
 *
 * Keep this framework-agnostic (plain data) so both consumers can import it.
 */

/** Convenience alias for Tailwind's `theme.extend` shape. */
type ThemeExtend = NonNullable<NonNullable<Config['theme']>['extend']>;

export const colors = {
  chalk: '#151515',
  railscasts: '#2B2B2B',
  eighties: '#2D2D2D',
} as const;

export const fontSize = {
  xxs: '.5rem',
} as const;

/**
 * Fraction-based width scale. Note: tailwind-merge already recognizes fraction
 * values for `max-w-*`/`min-w-*`, so these do NOT need registering in twMerge.
 */
export const widthFractions = {
  '1/4': '25%',
  '1/3': '33.333333%',
  '1/2': '50%',
  '3/4': '75%',
} as const;

export const maxWidth = { ...widthFractions };
export const minWidth = { ...widthFractions };

export const keyframes = {
  dropDown: {
    '0%': { transform: 'translateY(-10%)', opacity: '0' },
    '50%': { opacity: '1', transform: 'translateY(5%)' },
    '75%': { transform: 'translateY(-5%)' },
  },
  fadeIn: {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
};

/**
 * The object spread into Tailwind's `theme.extend`. Typed with Tailwind's own
 * `Config` type so it stays schema-valid.
 */
export const themeExtend = {
  colors,
  maxWidth,
  minWidth,
  keyframes,
  fontSize,
} satisfies ThemeExtend;

export default themeExtend;
