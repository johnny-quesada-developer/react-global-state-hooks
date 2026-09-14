import { useCounter } from '../stores/counter';
import { Panel, btn } from './Panel';

export function CounterPanel() {
  const [count, setCount] = useCounter();

  return (
    <Panel title="Counter (plain setState · react-hooks-global-states)">
      <p style={{ fontSize: 32, margin: '8px 0' }}>{count}</p>
      <button style={btn} onClick={() => setCount((c) => c + 1)}>
        +1
      </button>
      <button style={btn} onClick={() => setCount((c) => c - 1)}>
        -1
      </button>
      <button style={btn} onClick={() => setCount((c) => c + 10)}>
        +10
      </button>
      <button style={btn} onClick={() => setCount(0)}>
        reset
      </button>
    </Panel>
  );
}
