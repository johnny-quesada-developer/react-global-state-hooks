import { createContext } from 'react-global-state-hooks';

export const CounterContext = createContext(
  { count: 0 },
  {
    actions: {
      increment(by = 1) {
        return ({ setState }) => {
          setState((state) => ({ count: state.count + by }));
        };
      },
    },
  },
);

export function Counter({ label }: { label: string }) {
  // Reads the closest CounterContext.Provider above this component.
  const [count, actions] = CounterContext.use((state) => state.count);

  return (
    <button onClick={() => actions.increment()}>
      {label}: {count}
    </button>
  );
}

export function TwoCounters() {
  // Each Provider creates its own independent store.
  return (
    <>
      <CounterContext.Provider>
        <Counter label="left" />
      </CounterContext.Provider>
      <CounterContext.Provider value={{ count: 10 }}>
        <Counter label="right" />
      </CounterContext.Provider>
    </>
  );
}
