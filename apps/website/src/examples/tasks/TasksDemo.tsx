import '../shared/demo.css';
import './tasks.css';
import { AddTask } from './AddTask';
import { TaskList } from './TaskList';
import { TaskStats } from './TaskStats';
import { useTasks } from './store';

/** Restores the seed tasks. The workbench remounts the cards afterwards, which restarts their counters. */
export const resetTasksDemo = () => useTasks.actions.restore();

/** One-line trace for the workbench status bar. */
export function watchTasksDemo(log: (line: string) => void) {
  let previous = useTasks.getState();

  return useTasks.subscribe(
    (state) => {
      const before = previous;
      previous = state;
      const open = state.tasks.filter((task) => !task.done).length;
      if (state.tasks.length > before.tasks.length) log(`add → tasks: ${state.tasks.length} · open: ${open}`);
      else if (state.tasks.length < before.tasks.length) log(`remove → tasks: ${state.tasks.length} · open: ${open}`);
      else log(`toggle → open: ${open} · done: ${state.tasks.length - open}`);
    },
    { skipFirst: true },
  );
}

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
