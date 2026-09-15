import { createGlobalState } from 'react-hooks-global-states';

export type Todo = { id: number; text: string; done: boolean };

export type TodosState = {
  todos: Todo[];
};

let nextId = 3;

/**
 * Store with custom actions plus a derived selector hook, so the DevTools panel
 * shows a parent store and a child (selector) store staying in sync.
 */
export const useTodos = createGlobalState(
  {
    todos: [
      { id: 1, text: 'Wire up the debug package', done: true },
      { id: 2, text: 'Inspect state in DevTools', done: false },
    ],
  } as TodosState,
  {
    name: 'todos',
    actions: {
      add(text: string) {
        return ({ setState }) => {
          if (!text.trim()) return;
          setState((s) => ({ todos: [...s.todos, { id: nextId++, text, done: false }] }));
        };
      },

      toggle(id: number) {
        return ({ setState }) => {
          setState((s) => ({
            todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
          }));
        };
      },

      remove(id: number) {
        return ({ setState }) => {
          setState((s) => ({ todos: s.todos.filter((t) => t.id !== id) }));
        };
      },

      clearCompleted() {
        return ({ setState }) => {
          setState((s) => ({ todos: s.todos.filter((t) => !t.done) }));
        };
      },
    },
  },
);

/**
 * Derived hook: only re-renders when the count of pending todos changes.
 */
export const usePendingCount = useTodos.createSelectorHook(
  (state) => state.todos.filter((t) => !t.done).length,
  { name: 'todos:pendingCount' },
);
