import { wait } from '@src/shared/tools/promises';
import { createGlobalState } from 'react-global-state-hooks/createGlobalState';

type Theme = 'light' | 'dark';

const initialTheme: Theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export const theme$ = createGlobalState(initialTheme, {
  name: 'theme',
  localStorage: {
    key: 'theme',
    validator: ({ restored, initial }) => {
      const isValid = restored === 'light' || restored === 'dark';
      return isValid ? restored : initial;
    },
  },
  callbacks: {
    onInit: async ({ getState }) => {
      const theme = getState();

      // it needs to wait for the next tick to update the document
      await wait(0);
      updateDocument(theme);
    },
  },
  actions: {
    toggleTheme: () => {
      return ({ setState, getState }) => {
        const theme = getState() === 'light' ? 'dark' : 'light';

        setState(theme);
        updateDocument(theme);
      };
    },
  },
});

const updateDocument = (theme: Theme) => {
  window.document.documentElement.classList.remove('light', 'dark');
  window.document.documentElement.classList.add(theme);
};

export default theme$;
