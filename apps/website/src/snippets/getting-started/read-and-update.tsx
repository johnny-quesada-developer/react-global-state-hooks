import { useCounter } from './Counter';

export function CounterButton() {
  // Same shape as useState: [value, setValue].
  const [counter, setCounter] = useCounter();

  return (
    <button
      onClick={() =>
        setCounter((current) => ({
          ...current,
          count: current.count + current.step,
        }))
      }
    >
      Count: {counter.count}
    </button>
  );
}
