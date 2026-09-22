import { RenderCount } from '../shared/RenderCount';
import { useDoneCount, useOpenCount, useTasks } from './store';

export function TaskStats() {
  // Selector hooks return the value. They change only when the count does.
  const open = useOpenCount();
  const done = useDoneCount();

  return (
    <section className="demo-card demo-card--whole" aria-label="Task stats">
      <RenderCount />
      <span>
        {open} open, {done} done
      </span>
      <button type="button" onClick={() => useTasks.actions.clearDone()} disabled={done === 0}>
        Clear done
      </button>
    </section>
  );
}
