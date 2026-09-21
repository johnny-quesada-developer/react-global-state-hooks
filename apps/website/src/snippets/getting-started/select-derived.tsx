import { createGlobalState, shallowCompare } from 'react-global-state-hooks';

export const useTodos = createGlobalState({
  filter: 'all',
  todos: [
    { id: 1, text: 'Write docs', done: true },
    { id: 2, text: 'Ship examples', done: false },
  ],
});

export function OpenTodos() {
  // `filter` returns a new array on every run. Strict equality would treat each result as a change,
  // so compare the array's items instead.
  const [open] = useTodos((state) => state.todos.filter((todo) => !todo.done), { isEqual: shallowCompare });

  return <p>{open.length} open</p>;
}
