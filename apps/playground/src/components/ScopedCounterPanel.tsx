import { useMemo, useState } from 'react';
import { createGlobalState } from 'react-global-state-hooks';
import { Panel, btn } from './Panel';

/**
 * A createGlobalState created INSIDE a component via useMemo. Unlike a module-scope global store
 * (which lives for the whole page), this one is owned by the component's fiber, so it should be
 * cleaned up from the DevTools when the component unmounts — exercising the same fiber-based
 * cleanup as context, but for a plain global store.
 */
function ScopedCounter({ index, onRemove }: { index: number; onRemove: () => void }) {
  // Created once per mounted instance, during render -> captured by this component's fiber.
  const useCount = useMemo(() => createGlobalState(0, { name: `scoped-counter` }), []);
  const [count, setCount] = useCount();

  return (
    <div style={styles.instance}>
      <div style={styles.instanceHeader}>
        <strong>instance #{index + 1}</strong>
        <button style={btn} onClick={onRemove}>
          remove
        </button>
      </div>
      <button style={btn} onClick={() => setCount((c) => c - 1)}>
        -
      </button>
      <span style={styles.count}>{count}</span>
      <button style={btn} onClick={() => setCount((c) => c + 1)}>
        +
      </button>
    </div>
  );
}

export function ScopedCounterPanel() {
  const [instanceIds, setInstanceIds] = useState<number[]>([0]);
  const [nextId, setNextId] = useState(1);

  const addInstance = () => {
    setInstanceIds((ids) => [...ids, nextId]);
    setNextId((id) => id + 1);
  };

  const removeInstance = (id: number) => {
    setInstanceIds((ids) => ids.filter((existing) => existing !== id));
  };

  return (
    <Panel title="Scoped counter (createGlobalState in useMemo)">
      <button style={btn} onClick={addInstance}>
        add instance
      </button>
      <span style={styles.mounted}>{instanceIds.length} mounted</span>

      {instanceIds.map((id, index) => (
        <ScopedCounter key={id} index={index} onRemove={() => removeInstance(id)} />
      ))}
    </Panel>
  );
}

const styles: Record<string, React.CSSProperties> = {
  instance: {
    border: '1px dashed #d0d0d0',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  instanceHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  count: {
    display: 'inline-block',
    minWidth: 32,
    textAlign: 'center',
    fontVariantNumeric: 'tabular-nums',
  },
  mounted: {
    fontSize: 12,
    color: '#666',
  },
};
