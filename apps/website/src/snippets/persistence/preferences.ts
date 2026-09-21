import { createGlobalState } from 'react-global-state-hooks';

export interface Preferences {
  theme: 'light' | 'dark';
  language: string;
  sessionOnly: string;
}

// Annotate the value, not the call: passing a type argument to createGlobalState together with
// options does not compile (the options overload has three type parameters).
const initialPreferences: Preferences = { theme: 'light', language: 'en', sessionOnly: 'not saved' };

export const usePreferences = createGlobalState(initialPreferences, {
  localStorage: {
    key: 'docs:preferences',

    // Save only part of the state.
    selector: (state) => ({ theme: state.theme, language: state.language }),

    // Runs after every restore. Return the state to use, or `initial` to discard bad data.
    validator: ({ restored, initial }) => {
      if (typeof restored !== 'object' || restored === null) return initial;

      const { theme, language } = restored as Partial<Preferences>;

      return {
        ...initial,
        theme: theme === 'dark' ? 'dark' : 'light',
        language: typeof language === 'string' ? language : initial.language,
      };
    },
  },
});
