import { useCounter } from './create-store';

export function CountLabel() {
  // Re-renders only when `count` changes, not when `step` does.
  const [count] = useCounter((state) => state.count);

  return <span>{count}</span>;
}

export function StepLabel() {
  // `select` returns just the selected value when you do not need the setter.
  const step = useCounter.select((state) => state.step);

  return <span>{step}</span>;
}
