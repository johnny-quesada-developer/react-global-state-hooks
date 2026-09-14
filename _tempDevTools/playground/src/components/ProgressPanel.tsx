import { useEffect } from 'react';
import { useProgress } from '../stores/progress';
import { Panel, btn } from './Panel';

export function ProgressPanel() {
  const [{ value, running, rateMs }, actions] = useProgress();

  // Drive the ticking while running: one logged `tick` action per interval.
  useEffect(() => {
    if (!running) return;

    const id = window.setInterval(() => actions.tick(), rateMs);
    return () => window.clearInterval(id);
  }, [running, rateMs, actions]);

  return (
    <Panel title="Progress (high-frequency stress test · react-hooks-global-states)">
      <div style={styles.barTrack}>
        <div style={{ ...styles.barFill, width: `${value}%` }} />
      </div>
      <p style={{ fontSize: 14, margin: '8px 0', color: '#555' }}>
        {value}% · {running ? 'running' : 'stopped'} · every {rateMs}ms
      </p>

      <button style={btn} onClick={() => (running ? actions.stop() : actions.start())}>
        {running ? 'stop' : 'start'}
      </button>
      <button style={btn} onClick={() => actions.reset()}>
        reset
      </button>

      <div style={{ marginTop: 12 }}>
        <label style={{ fontSize: 14, color: '#555' }}>
          Update rate: {rateMs}ms
          <input
            style={{ display: 'block', width: '100%', marginTop: 6 }}
            type="range"
            min={1}
            max={1000}
            step={1}
            value={rateMs}
            onChange={(e) => actions.setRate(Number(e.target.value))}
          />
        </label>
      </div>
    </Panel>
  );
}

const styles: Record<string, React.CSSProperties> = {
  barTrack: {
    width: '100%',
    height: 16,
    borderRadius: 8,
    background: '#eee',
    overflow: 'hidden',
    border: '1px solid #ddd',
  },
  barFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #4f9dff, #2f6fe0)',
    transition: 'width 60ms linear',
  },
};
