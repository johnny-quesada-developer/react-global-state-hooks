import { memo, useId, useState } from 'react';
import { shallowCompare } from 'react-global-state-hooks';
import { RenderCount } from '../shared/RenderCount';
import { useTasks, type Task } from './store';

type Filter = 'all' | 'open' | 'done';
const filters: Filter[] = ['all', 'open', 'done'];

const TaskRow = memo(function TaskRow({ task }: { task: Task }) {
  return (
    <li className="task-row">
      <label>
        <input type="checkbox" checked={task.done} onChange={() => useTasks.actions.toggle(task.id)} />
        <span className={task.done ? 'task-row__text task-row__text--done' : 'task-row__text'}>
          {task.text}
        </span>
      </label>
      <RenderCount />
      <button
        type="button"
        aria-label={`Remove ${task.text}`}
        onClick={() => useTasks.actions.remove(task.id)}
      >
        Remove
      </button>
    </li>
  );
});

export function TaskList() {
  // The filter is plain component state, not store state. The selector depends on it.
  const [filter, setFilter] = useState<Filter>('all');
  const group = useId();

  const [visible] = useTasks(
    (state) => state.tasks.filter((task) => filter === 'all' || task.done === (filter === 'done')),
    { dependencies: [filter], isEqual: shallowCompare },
  );

  return (
    <section className="demo-card" aria-label="Task list">
      <RenderCount />
      <fieldset className="segmented">
        <legend>Show</legend>
        {filters.map((option) => (
          <label key={option}>
            <input type="radio" name={group} checked={filter === option} onChange={() => setFilter(option)} />
            <span>{option}</span>
          </label>
        ))}
      </fieldset>
      <ul className="task-list">
        {visible.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </ul>
      {visible.length === 0 && <p className="task-empty">Nothing to show.</p>}
    </section>
  );
}
