import React, { useEffect, useRef } from 'react';
import { cn } from '@src/shared/tools/cn';
import type { GlobalStateId } from '@src/shared/schema/GlobalStateJson';
import { getUnseenCount, subscribeToUnseenCount } from '@src/pages/main_tab/hooks/unseenLogs';

export type UnseenBadgeProps = {
  globalStateId: GlobalStateId;
  className?: string;
};

const format = (count: number) => (count > 99 ? '99+' : String(count));

/**
 * Self-contained "unseen logs" pill. Updates its OWN DOM node imperatively via a ref rather than
 * React state, so a state that changes as fast as a progress bar never triggers re-renders across
 * the (potentially large) state list. Only this one node's text/visibility mutate.
 */
export const UnseenBadge: React.FC<UnseenBadgeProps> = React.memo(({ globalStateId, className = '' }) => {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const render = (count: number) => {
      if (count > 0) {
        node.textContent = format(count);
        node.style.display = '';
      } else {
        node.textContent = '';
        node.style.display = 'none';
      }
    };

    render(getUnseenCount(globalStateId));
    const unsubscribe = subscribeToUnseenCount(globalStateId, render);

    return () => {
      unsubscribe();
    };
  }, [globalStateId]);

  return (
    <span
      ref={ref}
      // Starts hidden; the effect reveals it if there are unseen logs.
      style={{ display: 'none' }}
      title="unseen actions"
      className={cn(
        'ml-auto inline-flex items-center rounded-sm px-1 text-xxs font-semibold leading-4',
        'bg-blue-500 text-white',
        className,
      )}
    />
  );
});

UnseenBadge.displayName = 'UnseenBadge';

export default UnseenBadge;
