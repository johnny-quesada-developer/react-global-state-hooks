import { useState } from 'react';
import { FormContext } from '../stores/formContext';
import { Panel, btn, input } from './Panel';

function Fields() {
  const [form, actions] = FormContext.use();

  return (
    <div>
      <div>
        <input
          style={input}
          value={form.name}
          onChange={(e) => actions.setField('name', e.target.value)}
          placeholder="name"
        />
      </div>
      <div>
        <input
          style={input}
          value={form.email}
          onChange={(e) => actions.setField('email', e.target.value)}
          placeholder="email"
        />
      </div>
      <button style={btn} onClick={() => actions.reset()}>
        reset
      </button>
      <pre style={styles.preview}>{JSON.stringify(form, null, 2)}</pre>
    </div>
  );
}

/**
 * A single mounted instance of the same context template. Mounting/unmounting this component
 * mounts/unmounts a distinct FormContext.Provider fiber — which is exactly what exercises the
 * fiber-based store cleanup in the DevTools patch (multiple stores share one path; removing one
 * should delete only that instance).
 */
function FormInstance({ index, onRemove }: { index: number; onRemove: () => void }) {
  return (
    <div style={styles.instance}>
      <div style={styles.instanceHeader}>
        <strong>instance #{index + 1}</strong>
        <button style={btn} onClick={onRemove}>
          remove
        </button>
      </div>
      <FormContext.Provider>
        <Fields />
      </FormContext.Provider>
    </div>
  );
}

export function FormContextPanel() {
  // Track instances by a stable id so React keeps/removes the right provider fibers.
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
    <Panel title="Form (context + actions · createContext)">
      <button style={btn} onClick={addInstance}>
        add instance
      </button>
      <span style={styles.count}>{instanceIds.length} mounted</span>

      {instanceIds.map((id, index) => (
        <FormInstance key={id} index={index} onRemove={() => removeInstance(id)} />
      ))}
    </Panel>
  );
}

const styles: Record<string, React.CSSProperties> = {
  preview: {
    background: '#f4f4f4',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    fontSize: 12,
  },
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
    fontSize: 12,
    color: '#666',
  },
};
