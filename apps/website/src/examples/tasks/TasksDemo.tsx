import '../shared/demo.css';
import './tasks.css';
import { AddTask } from './AddTask';
import { TaskList } from './TaskList';
import { TaskStats } from './TaskStats';
import { useTasks } from './store';

/** Restores the seed tasks. The workbench remounts the cards afterwards, which restarts their counters. */
export const resetTasksDemo = () => useTasks.actions.restore();

export function TasksDemo() {
  return (
    <div className="demo">
      <div className="demo-grid demo-grid--stack">
        <AddTask />
        <TaskList />
        <TaskStats />
      </div>
    </div>
  );
}
