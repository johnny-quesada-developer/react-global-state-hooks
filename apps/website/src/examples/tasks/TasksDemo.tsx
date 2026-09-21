import { useState } from 'react';
import '../shared/demo.css';
import './tasks.css';
import { AddTask } from './AddTask';
import { TaskList } from './TaskList';
import { TaskStats } from './TaskStats';
import { useTasks } from './store';

export function TasksDemo() {
  const [epoch, setEpoch] = useState(0);

  const reset = () => {
    useTasks.reset();
    setEpoch((current) => current + 1);
  };

  return (
    <div className="demo">
      <div className="demo-grid demo-grid--wide" key={epoch}>
        <TaskList />
        <div className="demo-stack">
          <AddTask />
          <TaskStats />
        </div>
      </div>
      <button type="button" className="demo-reset" onClick={reset}>
        Reset demo
      </button>
    </div>
  );
}
