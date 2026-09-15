import React, { useEffect, useRef } from 'react';
import styles from './Collapsible.module.scss';
import { cn } from '@src/shared/tools/cn';
import { assertIsNonNullable, isFunction } from '@src/shared/asserts/asserts';
import isNil from 'json-storage-formatter/isNil';
import { wait } from '@src/shared/tools/promises';
import { debounce } from '@src/shared/tools/debounce';
import useStableRef from '@src/pages/main_tab/hooks/useStableRef';
import useMountEffect from '@src/pages/main_tab/hooks/useMountEffect';

export type CollapsibleAPI = {
  open: () => void;
  close: () => void;
  toggle: () => void;
  isOpen: boolean;
  resizeObserver?: ResizeObserver;
};

export type CollapsibleProps = React.DetailsHTMLAttributes<HTMLDetailsElement> & {
  summary: (api: CollapsibleAPI) => React.ReactNode;
  children: React.ReactNode | ((api: CollapsibleAPI) => React.ReactNode);
};

export const Collapsible: React.FC<CollapsibleProps> = ({
  className = '',
  children,
  summary,
  open: openProp,
  ...props
}: CollapsibleProps) => {
  const ref = useRef<HTMLDivElement | null>(null);

  const collapsible = useStableRef((): CollapsibleAPI => {
    const collapsible = {
      isOpen: !!openProp,
    } as CollapsibleAPI;

    const updateHeightDebounced = debounce(() => {
      if (isNil(ref.current)) return;
      if (!collapsible.isOpen) return;

      const rect = ref.current.getBoundingClientRect();

      ref.current.style.height = `${rect.height}px`;
    }, 500);

    const resizeObserver = new ResizeObserver(() => {
      if (isNil(ref.current) || !collapsible.isOpen) return;

      ref.current.style.height = 'unset';
      updateHeightDebounced();
    });

    const open = async () => {
      assertIsNonNullable(ref.current, 'open is not available during render');

      ref.current.classList.remove('!h-0', 'overflow-hidden');

      const rect = ref.current.getBoundingClientRect();
      ref.current.style.height = '0px';

      await wait(1);

      collapsible.isOpen = true;
      ref.current.style.height = `${rect.height}px`;

      await wait(300);

      resizeObserver.observe(ref.current);
    };

    const close = () => {
      assertIsNonNullable(ref.current, 'close is not available during render');

      collapsible.isOpen = false;
      ref.current.style.height = 'unset';
      ref.current.classList.add('!h-0', 'overflow-hidden');

      resizeObserver.unobserve(ref.current);
    };

    const toggle = () => {
      assertIsNonNullable(ref.current, 'toggle is not available during render');

      if (collapsible.isOpen) {
        return close();
      }

      return open();
    };

    collapsible.open = open;
    collapsible.close = close;
    collapsible.toggle = toggle;
    collapsible.resizeObserver = resizeObserver;

    return collapsible;
  }, []).current;

  // Cleanup on unmount
  useMountEffect(() => {
    const { resizeObserver } = collapsible;

    return () => {
      resizeObserver?.disconnect();
    };
  });

  useEffect(() => {
    if (openProp) {
      collapsible.open();
      return;
    }

    collapsible.close();
  }, [collapsible, openProp]);

  const summary$ = isFunction(summary) ? summary(collapsible) : summary;
  const children$ = isFunction(children) ? children(collapsible) : children;

  return (
    <details open className={cn('Collapsible', className)} {...props}>
      <summary>{summary$}</summary>

      <div
        ref={ref}
        className={cn(styles.details, 'transition-all duration-300', {
          '!h-0 overflow-hidden': !collapsible.isOpen,
        })}
      >
        {children$}
      </div>
    </details>
  );
};

export default Collapsible;
