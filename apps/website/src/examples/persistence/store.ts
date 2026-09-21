import { createGlobalState } from 'react-global-state-hooks';

export const ACCENTS = ['mint', 'sky', 'yellow'] as const;
export const SIZES = ['small', 'medium', 'large'] as const;

export interface Preferences {
  accent: (typeof ACCENTS)[number];
  size: (typeof SIZES)[number];
  compact: boolean;
  /** Typed in the demo but never saved: it is not part of the `selector`. */
  draft: string;
}

export const defaults: Preferences = { accent: 'mint', size: 'medium', compact: false, draft: '' };

export const STORAGE_KEY = 'examples:preferences';

// A function initializer so `reset()` can restore the defaults.
export const usePreferences = createGlobalState(() => ({ ...defaults }), {
  localStorage: {
    key: STORAGE_KEY,

    // save only what should survive a reload
    selector: (state) => ({ accent: state.accent, size: state.size, compact: state.compact }),

    // never trust what is in storage: keep only values that are still valid
    validator: ({ restored, initial }) => {
      if (typeof restored !== 'object' || restored === null) return initial;

      const saved = restored as Partial<Preferences>;

      return {
        ...initial,
        accent: ACCENTS.includes(saved.accent as Preferences['accent']) ? saved.accent! : initial.accent,
        size: SIZES.includes(saved.size as Preferences['size']) ? saved.size! : initial.size,
        compact: typeof saved.compact === 'boolean' ? saved.compact : initial.compact,
      };
    },
  },
});
