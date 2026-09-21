import { createGlobalState } from 'react-global-state-hooks';

export interface Task {
  id: number;
  text: string;
  done: boolean;
}

const initialTasks = (): Task[] => [
  { id: 1, text: 'Write the docs', done: true },
  { id: 2, text: 'Ship the examples', done: false },
  { id: 3, text: 'Review feedback', done: false },
];

// A function initializer lets `useTasks.reset()` restore the seed data.
export const useTasks = createGlobalState(() => ({ tasks: initialTasks(), nextId: 4 }), {
  actions: {
    add(text: string) {
      return ({ setState }) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        setState((state) => ({
          tasks: [...state.tasks, { id: state.nextId, text: trimmed, done: false }],
          nextId: state.nextId + 1,
        }));
      };
    },

    toggle(id: number) {
      return ({ setState }) => {
        setState((state) => ({
          ...state,
          tasks: state.tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
        }));
      };
    },

    remove(id: number) {
      return ({ setState }) => {
        setState((state) => ({ ...state, tasks: state.tasks.filter((task) => task.id !== id) }));
      };
    },

    clearDone() {
      return ({ setState }) => {
        setState((state) => ({ ...state, tasks: state.tasks.filter((task) => !task.done) }));
      };
    },
  },
});

// Derived values are computed once per change and shared by every component that uses them.
export const useOpenCount = useTasks.createSelectorHook(
  (state) => state.tasks.filter((task) => !task.done).length,
);
export const useDoneCount = useTasks.createSelectorHook(
  (state) => state.tasks.filter((task) => task.done).length,
);
