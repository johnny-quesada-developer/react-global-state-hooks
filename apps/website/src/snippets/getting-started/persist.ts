import { createGlobalState } from 'react-global-state-hooks';

export const usePreferences = createGlobalState(
  { theme: 'light' as 'light' | 'dark', compact: false },
  {
    // Saved to window.localStorage on change, restored when the store is created.
    localStorage: { key: 'preferences' },
  },
);
