import React, { useEffect, useRef } from 'react';
import { cn } from '@src/shared/tools/cn';
import type { GlobalStateId } from '@src/shared/schema/GlobalStateJson';
import { stateMetaDevTools$ } from '../../../../hooks/globalStates';
import { assertIsNonNullable } from '@src/shared/asserts/asserts';

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
export const UnseenBadge: React.FC<UnseenBadgeProps> = React.memo(({ globalStateId, className }) => {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const unsubscribe = stateMetaDevTools$.subscribe(
      (state) => {
        const meta = state.get(globalStateId);
        assertIsNonNullable(meta, `Unable to find state meta for globalStateId: ${globalStateId}`);
        return meta.unseenLength;
      },
      (unseenLength) => {
        if (unseenLength > 0) {
          element.textContent = format(unseenLength);
          element.style.display = '';
          return;
        }

        element.textContent = '';
        element.style.display = 'none';
      },
    );

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
