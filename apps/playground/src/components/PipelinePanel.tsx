import { usePipeline, type PipelineStage } from '../stores/pipeline';
import { Panel, btn } from './Panel';

const stageColor: Record<PipelineStage, string> = {
  idle: '#888',
  validating: '#4f9dff',
  uploading: '#4f9dff',
  processing: '#f0a020',
  finalizing: '#f0a020',
  done: '#2fae5a',
  failed: '#e0483d',
};

export function PipelinePanel() {
  const [{ stage, progress, steps, lastError }, actions] = usePipeline();

  const running = stage !== 'idle' && stage !== 'done' && stage !== 'failed';

  return (
    <Panel title="Pipeline (multi-stage actions · react-hooks-global-states)">
      <p style={{ fontSize: 14, margin: '0 0 8px', color: '#555' }}>
        Each action calls <code>setState</code> multiple times during its lifecycle. The async
        actions interleave <code>setState</code> with <code>await</code>, so DevTools shows every
        intermediate transition.
      </p>

      <div style={styles.barTrack}>
        <div
          style={{ ...styles.barFill, width: `${progress}%`, background: stageColor[stage] }}
        />
      </div>
      <p style={{ fontSize: 14, margin: '8px 0', color: '#555' }}>
        stage: <strong style={{ color: stageColor[stage] }}>{stage}</strong> · {progress}%
        {running ? ' · running…' : ''}
      </p>

      {lastError && (
        <p style={{ fontSize: 14, margin: '8px 0', color: stageColor.failed }}>error: {lastError}</p>
      )}

      <div>
        <button style={btn} disabled={running} onClick={() => actions.runSync()}>
          run sync
        </button>
        <button style={btn} disabled={running} onClick={() => actions.runAsync()}>
          run async
        </button>
        <button style={btn} disabled={running} onClick={() => actions.runAsyncFailing()}>
          run async (fails)
        </button>
        <button style={btn} disabled={running} onClick={() => actions.reset()}>
          reset
        </button>
      </div>

      {steps.length > 0 && (
        <ol style={styles.steps}>
          {steps.map((step, i) => (
            <li key={i} style={{ fontSize: 13, color: '#444' }}>
              {step}
            </li>
          ))}
        </ol>
      )}
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
    transition: 'width 200ms linear, background 200ms linear',
  },
  steps: {
    marginTop: 12,
    marginBottom: 0,
    paddingLeft: 20,
    lineHeight: 1.6,
  },
};
