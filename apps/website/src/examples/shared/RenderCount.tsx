import { useEffect, useRef } from 'react';

/**
 * Shows how many times the component that renders it has committed.
 *
 * Counting happens in effects, not during render, so React Strict Mode's double render in
 * development does not inflate the number. The first commit is the initial "1"; the cleanup resets
 * the counter so Strict Mode's simulated unmount/remount does not count as an update either.
 * The element is updated directly, so counting never causes a render of its own.
 */
export function RenderCount() {
  const element = useRef<HTMLSpanElement>(null);
  const count = useRef(1);
  const isFirstCommit = useRef(true);

  useEffect(
    () => () => {
      count.current = 1;
      isFirstCommit.current = true;
    },
    [],
  );

  // No dependency array on purpose: run after every commit of the parent component.
  useEffect(() => {
    if (isFirstCommit.current) {
      isFirstCommit.current = false;
      return;
    }

    count.current += 1;
    const node = element.current;
    if (!node) return;

    node.textContent = String(count.current);
    node.classList.remove('render-count--flash');
    void node.offsetWidth; // restart the CSS animation
    node.classList.add('render-count--flash');
  });

  return (
    <span className="render-count" title="Times this component has rendered">
      renders{' '}
      <span ref={element} data-testid="render-count">
        1
      </span>
    </span>
  );
}
