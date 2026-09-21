import { createGlobalState } from 'react-global-state-hooks';

export interface Todo {
  id: number;
  text: string;
  done: boolean;
}

export const useTodos = createGlobalState(
  { todos: [] as Todo[], nextId: 1 },
  {
    actions: {
      add(text: string) {
        return ({ setState }) => {
          setState((state) => ({
            todos: [...state.todos, { id: state.nextId, text, done: false }],
            nextId: state.nextId + 1,
          }));
        };
      },

      toggle(id: number) {
        return ({ setState }) => {
          setState((state) => ({
            ...state,
            todos: state.todos.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)),
          }));
        };
      },

      // Actions can return values, and can call the store's other actions through `actions`.
      addMany(texts: string[]) {
        return ({ actions }) => {
          texts.forEach((text) => actions.add(text));

          return texts.length;
        };
      },
    },
  },
);
