import React, { useEffect, useRef } from 'react';
import { FaBell } from 'react-icons/fa';
import { cn } from '@src/shared/tools/cn';
import { throttle } from '@src/shared/tools';
import type { GlobalStateId } from '@src/shared/schema/GlobalStateJson';
import { stateMetaDevTools$ } from '../../../../hooks/globalStates';
import { assertIsNonNullable } from '@src/shared/asserts/asserts';

export type UnseenBadgeProps = {
  globalStateId: GlobalStateId;
  className?: string;
};

const format = (count: number) => (count > 99 ? '99+' : String(count));

export const UnseenBadge: React.FC<UnseenBadgeProps> = React.memo(({ globalStateId, className }) => {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // avoid onMount animation
    let shouldAnimate = false;

    const ring = throttle(() => {
      if (!shouldAnimate) {
        shouldAnimate = true;
        return;
      }

      element.classList.remove('animate-bell-ring');
      // Force reflow to restart the CSS animation
      // DO NOT REMOVE THIS LINE EVEN IF IT SEEMS UNUSED
      void element.offsetWidth;
      element.classList.add('animate-bell-ring');
    }, 400);

    const unsubscribe = stateMetaDevTools$.subscribe(
      (state) => {
        const meta = state.get(globalStateId);
        assertIsNonNullable(meta, `Unable to find state meta for globalStateId: ${globalStateId}`);
        return meta.unseenLength;
      },
      (unseenLength) => {
        if (unseenLength <= 0) {
          element.style.display = 'none';
          return;
        }

        element.dataset.count = format(unseenLength);
        element.style.display = '';
        ring();
      },
    );

    return () => {
      unsubscribe();
    };
  }, [globalStateId]);

  return (
    <span
      ref={ref}
      style={{ display: 'none' }}
      title="unseen actions"
      className={cn(
        'ml-auto inline-flex items-center gap-1 rounded-sm px-1 text-xxs font-semibold leading-4',
        'bg-blue-500 text-white',
        'after:content-[attr(data-count)]',
        className,
      )}
    >
      <FaBell />
    </span>
  );
});

UnseenBadge.displayName = 'UnseenBadge';

export default UnseenBadge;
