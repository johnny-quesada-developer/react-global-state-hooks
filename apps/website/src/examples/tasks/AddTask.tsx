import { useState, type FormEvent } from 'react';
import { RenderCount } from '../shared/RenderCount';
import { useTasks } from './store';

export function AddTask() {
  // Uses the actions only, never subscribes to the tasks: it does not render when they change.
  const [text, setText] = useState('');
  const [invalid, setInvalid] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) {
      setInvalid(true);
      return;
    }

    useTasks.actions.add(text);
    setText('');
    setInvalid(false);
  };

  return (
    <form className="demo-card" onSubmit={submit} aria-label="Add task">
      <RenderCount />
      <div className="tasks-header">
        <h3>Today’s tasks</h3>
      </div>
      <div className="task-form">
        <label>
          <span className="sr-only">New task</span>
          <input
            value={text}
            placeholder="What needs to get done?"
            maxLength={80}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? 'task-error' : undefined}
            onChange={(event) => {
              setText(event.target.value);
              if (invalid && event.target.value.trim()) setInvalid(false);
            }}
          />
        </label>
        <button type="submit" className="demo-button demo-button--primary task-form-submit" aria-label="Add task">
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
      {invalid && (
        <p className="demo-caption" id="task-error" role="alert" style={{ color: 'var(--color-red)' }}>
          Add a task name first.
        </p>
      )}
    </form>
  );
}
