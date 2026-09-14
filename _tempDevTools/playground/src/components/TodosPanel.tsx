import { useState } from 'react';
import { useTodos, usePendingCount } from '../stores/todos';
import { Panel, btn, input } from './Panel';

export function TodosPanel() {
  const [{ todos }, actions] = useTodos();
  const pending = usePendingCount();
  const [text, setText] = useState('');

  return (
    <Panel title="Todos (actions + selector hook · react-hooks-global-states)">
      <p style={{ color: '#555' }}>
        Pending (derived selector hook): <strong>{pending}</strong>
      </p>

      <div>
        <input
          style={input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="new todo"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              actions.add(text);
              setText('');
            }
          }}
        />
        <button
          style={btn}
          onClick={() => {
            actions.add(text);
            setText('');
          }}
        >
          add
        </button>
        <button style={btn} onClick={() => actions.clearCompleted()}>
          clear completed
        </button>
      </div>

      <ul style={{ paddingLeft: 18 }}>
        {todos.map((t) => (
          <li key={t.id} style={{ marginTop: 6 }}>
            <label style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={t.done} onChange={() => actions.toggle(t.id)} />{' '}
              <span style={{ textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</span>
            </label>
            <button style={{ ...btn, marginTop: 0, padding: '2px 8px' }} onClick={() => actions.remove(t.id)}>
              ✕
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
