import { useCounter } from './actions';

export function Counter() {
  // With actions configured, the second tuple item is the actions object instead of a setter.
  const [count, actions] = useCounter((state) => state.count);

  return (
    <div>
      <output>{count}</output>
      <button onClick={() => actions.increment()}>+1</button>
      <button onClick={() => actions.increment(10)}>+10</button>
      <button onClick={() => actions.reset()}>Reset</button>
    </div>
  );
}
