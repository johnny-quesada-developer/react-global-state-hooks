import { useState } from 'react';
import { createGlobalState, shallowCompare } from 'react-global-state-hooks';

export const useTodos = createGlobalState({
  todos: [
    { id: 1, text: 'Write docs', done: true },
    { id: 2, text: 'Ship examples', done: false },
    { id: 3, text: 'Review', done: false },
  ],
});

export function TodoList() {
  // Local state that is NOT in the store, but the selection depends on it.
  const [showDone, setShowDone] = useState(false);

  const [visible] = useTodos((state) => state.todos.filter((todo) => todo.done === showDone), {
    // re-run the selector when this changes, not only when the store does
    dependencies: [showDone],
    isEqual: shallowCompare,
  });

  return (
    <div>
      <button onClick={() => setShowDone(!showDone)}>{showDone ? 'Show open' : 'Show done'}</button>
      <ul>
        {visible.map((todo) => (
          <li key={todo.id}>{todo.text}</li>
        ))}
      </ul>
    </div>
  );
}
