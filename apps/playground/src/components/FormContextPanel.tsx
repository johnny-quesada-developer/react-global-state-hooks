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

export function FormContextPanel() {
  return (
    <Panel title="Form (context + actions · createContext)">
      <FormContext.Provider>
        <Fields />
      </FormContext.Provider>
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
};
