import { RenderCount } from '../shared/RenderCount';
import { useDoneCount, useOpenCount, useTasks } from './store';

export function TaskStats() {
  // Selector hooks return the value. They change only when the count does.
  const open = useOpenCount();
  const done = useDoneCount();

  return (
    <section className="demo-card" aria-label="Task stats">
      <div className="tasks-footer">
        <span>
          {open} open, {done} done
        </span>
        <RenderCount />
        <button type="button" className="demo-text-button" onClick={() => useTasks.actions.clearDone()} disabled={done === 0}>
          Clear done
        </button>
      </div>
    </section>
  );
}
