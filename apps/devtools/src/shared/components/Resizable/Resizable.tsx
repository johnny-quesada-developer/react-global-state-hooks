import React, { PropsWithChildren, useCallback, useEffect, useRef } from 'react';
import styles from './Resizable.module.css';
import { cn } from '@src/shared/tools/cn';
import type { Subscription } from 'easy-cancelable-promise/types';
import { assertIsNonNullable, isNonNullable } from '@src/shared/asserts/asserts';
import { FaArrowRight } from 'react-icons/fa';
import { FaLeftLong } from 'react-icons/fa6';

export type ResizableProps = PropsWithChildren<
  React.HTMLAttributes<HTMLDivElement> & {
    initialLeft: string;
  }
>;

export const Resizable: React.FC<ResizableProps> = ({
  className = '',
  initialLeft,
  children,
  ...props
}: ResizableProps) => {
  const resizableRef = useRef<HTMLDivElement | null>(null);
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  useEffect(() => {
    if (!isNonNullable(resizableRef.current)) return;
    if (isCollapsed) return;

    const resizable = resizableRef.current;
    const subscriptions: Subscription[] = [];
    const parent = resizable.parentElement;
    assertIsNonNullable(parent, 'Resizable component must have a parent element');

    let initialWidthRightPanel = resizable.getBoundingClientRect().width;

    const addWindowSubscription = (type: 'mousemove' | 'mouseup', handler: (event: MouseEvent) => void) => {
      window.addEventListener(type, handler);
      subscriptions.push(() => window.removeEventListener(type, handler));
    };

    const handleMouseDown = (event: MouseEvent) => {
      const resizableRect = resizable.getBoundingClientRect();

      const initialX = event.clientX;
      const rightPosition = resizableRect.right;

      const acceptedMargin = 10;
      const isRightBorderOfContainer = Math.abs(initialX - rightPosition) < acceptedMargin;

      if (!isRightBorderOfContainer) return;

      event.preventDefault();
      initialWidthRightPanel = resizable.getBoundingClientRect().width;

      resizable.classList.add(styles.resizing);
      document.body.style.cursor = 'col-resize';

      const handleMouseMove = (event: MouseEvent) => {
        const deltaX = event.clientX - initialX;
        const newPanel1Width = initialWidthRightPanel + deltaX;

        resizable.style.width = `${newPanel1Width}px`;
        (resizable.nextSibling as HTMLElement).style.width = `calc(100% - ${newPanel1Width}px)`;
      };

      const handleMouseUp = () => {
        subscriptions.forEach((unsubscribe) => unsubscribe());
        resizable.classList.remove(styles.resizing);
        document.body.style.cursor = 'auto';
      };

      addWindowSubscription('mousemove', handleMouseMove);
      addWindowSubscription('mouseup', handleMouseUp);
    };

    resizable.addEventListener('mousedown', handleMouseDown);

    return () => {
      resizable.removeEventListener('mousedown', handleMouseDown);
      subscriptions.forEach((unsubscribe) => unsubscribe());
    };
  }, [isCollapsed]);

  const [panel1, panel2] = React.Children.toArray(children);
  const toggleCollapse = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      setIsCollapsed((prev) => !prev);

      resizableRef.current!.style.width = isCollapsed ? initialLeft : '20px';
      event.stopPropagation();
    },
    [initialLeft, isCollapsed]
  );

  return (
    <div className={cn('Resizable flex w-full h-full', className)} {...props}>
      <div
        ref={resizableRef}
        className={cn(
          'h-full _resizable relative resize-x overflow-hidden',
          'box-content border-r-4 border-gray-400 border-dashed',
          'before:content-[""] before:h-full before:w-0.5 before:cursor-col-resize before:z-10',
          'before:absolute before:-left-0 before:top-0 min-w-3'
        )}
        style={{ width: initialLeft }}
      >
        {isCollapsed && (
          <div
            onMouseDown={toggleCollapse}
            className={cn([
              '_placeholder2 w-full h-full bg-gray-300 cursor-pointer',
              'absolute right-0 top-0 ',
              ' z-20',
            ])}
          ></div>
        )}

        <div
          className={cn(
            '_anchor absolute bottom-0 right-0 w-6 h-6 z-20',
            'bg-gray-200 cursor-pointer flex items-center justify-center',
            'text-xs border border-r-0 border-black rounded-l-md flex-grow min-w-3'
          )}
          onMouseDown={toggleCollapse}
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {!isCollapsed ? <FaLeftLong /> : <FaArrowRight />}
        </div>

        {panel1}
      </div>

      <div className="flex-grow min-w-3" style={{ width: `calc(100% - ${initialLeft})` }}>
        {panel2}
      </div>
    </div>
  );
};

export default Resizable;
