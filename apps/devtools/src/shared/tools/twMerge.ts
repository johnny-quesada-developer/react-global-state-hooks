import { extendTailwindMerge } from 'tailwind-merge';
import { colors, fontSize } from '../theme';

/**
 * Project-configured `tailwind-merge` instance.
 *
 * The default `twMerge` only knows Tailwind's built-in scales, so it misclassifies
 * our custom theme extensions and drops the wrong class. Example: `text-xxs` is a
 * custom font size, but default twMerge lumps `text-xxs` and `text-gray-500` into
 * the same `text-*` group and keeps only the last one.
 *
 * We only need to register the theme extensions that use CUSTOM keys tailwind-merge
 * can't recognize on its own (v3 `theme` groups):
 *   - `text`  -> custom font sizes (e.g. `text-xxs`), drives the `font-size` group
 *   - `color` -> custom colors (e.g. `text-eighties`), drives the color groups
 *
 * The other theme extensions are intentionally NOT registered here:
 *   - `maxWidth` / `minWidth`: their values are fractions (`1/2`, `3/4`, ...), which
 *     tailwind-merge already treats as valid `max-w-*`/`min-w-*` values.
 *   - `keyframes`: they don't create `animate-*` utilities on their own (no custom
 *     `animation` tokens exist), so there is nothing for twMerge to classify.
 *
 * Values are derived from the SAME source as the Tailwind config
 * (src/shared/theme.ts), so the two can never drift.
 */
export const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: Object.keys(fontSize),
      color: Object.keys(colors),
    },
  },
});

export default twMerge;
