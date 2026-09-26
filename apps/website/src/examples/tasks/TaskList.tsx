import { memo, useId, useState } from 'react';
import { shallowCompare } from 'react-global-state-hooks';
import { RenderCount } from '../shared/RenderCount';
import { useOpenCount, useTasks, type Task } from './store';

type Filter = 'all' | 'open' | 'done';
const filters: Filter[] = ['all', 'open', 'done'];

const empty: Record<Filter, [string, string]> = {
  all: ['A fresh start.', 'Add a task above to keep going.'],
  open: ['All clear.', 'Add a task above to keep going.'],
  done: ['Nothing completed yet.', 'Complete a task to see it here.'],
};

const TaskRow = memo(function TaskRow({ task }: { task: Task }) {
  return (
    <li className="task-row">
      <label>
        <input type="checkbox" checked={task.done} onChange={() => useTasks.actions.toggle(task.id)} />
        <span className={task.done ? 'task-row__text task-row__text--done' : 'task-row__text'}>{task.text}</span>
      </label>
      <RenderCount />
      <button type="button" aria-label={`Remove ${task.text}`} onClick={() => useTasks.actions.remove(task.id)}>
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" style={{ width: 14, height: 14 }}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </button>
    </li>
  );
});

export function TaskList() {
  // The filter is plain component state, not store state. The selector depends on it.
  const [filter, setFilter] = useState<Filter>('all');
  const group = useId();
  const open = useOpenCount();

  const [visible] = useTasks(
    (state) => state.tasks.filter((task) => filter === 'all' || task.done === (filter === 'done')),
    { dependencies: [filter], isEqual: shallowCompare },
  );

  return (
    <section className="demo-card" aria-label="Task list">
      <div className="tasks-header tasks-header--list">
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
        <span className="tasks-open">{open} open</span>
      </div>
      {visible.length > 0 ? (
        <ul className="task-list">
          {visible.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </ul>
      ) : (
        <div className="task-empty">
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" style={{ width: 27, height: 27 }}>
            <path d="m5 12 4 4L19 6" />
          </svg>
          <h4>{empty[filter][0]}</h4>
          <p className="task-empty-text">{empty[filter][1]}</p>
        </div>
      )}
    </section>
  );
}
