import { createContext } from 'react-global-state-hooks';

export const NoteContext = createContext(
  { title: 'Untitled note', body: '' },
  {
    name: 'note',
    actions: {
      setTitle(title: string) {
        return ({ setState }) => {
          setState((note) => ({ ...note, title }));
        };
      },
      setBody(body: string) {
        return ({ setState }) => {
          setState((note) => ({ ...note, body }));
        };
      },
      clear() {
        return ({ setState }) => {
          setState((note) => ({ ...note, body: '' }));
        };
      },
    },
  },
);

// Derived once per provider; a component that only shows the count ignores title edits.
export const useWordCount = NoteContext.use.createSelectorHook(
  (note) => {
    const words = note.body.trim();

    return words ? words.split(/\s+/).length : 0;
  },
  { name: 'wordCount' },
);
