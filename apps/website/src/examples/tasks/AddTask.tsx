import { useState, type FormEvent } from 'react';
import { RenderCount } from '../shared/RenderCount';
import { useTasks } from './store';

export function AddTask() {
  // Uses the actions only, never subscribes to the tasks: it does not render when they change.
  const [text, setText] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    useTasks.actions.add(text);
    setText('');
  };

  return (
    <form className="demo-card" onSubmit={submit} aria-label="Add task">
      <RenderCount />
      <label>
        New task
        <input value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      <button type="submit">Add task</button>
    </form>
  );
}
