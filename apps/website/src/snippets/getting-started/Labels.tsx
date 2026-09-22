import { useCounter } from './Counter';

export function Labels() {
  /**
   * Re-renders only when `count` changes, not when `step` does.
   * `select` returns just the selected value when you do not need the setter.
   */
  const [count] = useCounter((state) => state.count);
  const step = useCounter.select((state) => state.step);

  return (
    <>
      <span>{count}</span>
      <span>{step}</span>
    </>
  );
}
