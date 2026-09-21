import { createGlobalState } from 'react-global-state-hooks';

// Version 1 stored { theme }. Version 2 added `compact`.
// A function initializer means reset() can restore the original values.
export const useSettings = createGlobalState(() => ({ theme: 'light', compact: false }), {
  localStorage: {
    key: 'docs:settings',
    versioning: {
      version: 2,
      // Called when the stored version differs from `version`.
      migrator: ({ legacy, initial }) => {
        const old = legacy as { theme?: string } | null;

        return { ...initial, theme: old?.theme ?? initial.theme };
      },
    },
  },
});
