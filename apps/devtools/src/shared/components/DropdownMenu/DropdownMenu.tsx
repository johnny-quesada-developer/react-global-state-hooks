import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@src/shared/tools/cn';

export type DropdownMenuItem = {
  label: React.ReactNode;
  onSelect: () => void;
  icon?: React.ReactNode;
  /** Visually mark a destructive action (e.g. red text). */
  danger?: boolean;
  disabled?: boolean;
};

export type DropdownMenuProps = {
  /** The clickable trigger (e.g. an ellipsis icon). Rendered inside the trigger button. */
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  /** Accessible label for the trigger button. */
  label?: string;
  className?: string;
  triggerClassName?: string;
};

const MENU_WIDTH = 176; // matches min-w-44
const MARGIN = 6;

/**
 * A small action menu anchored to a trigger button. The menu is portaled to <body> and positioned
 * with fixed coordinates so it is never clipped by a scrolling/overflow-hidden list row (which is
 * why a plain absolutely-positioned dropdown does not work inside the log lists). Closes on outside
 * click, Escape, or scroll/resize.
 */
export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  trigger,
  items,
  label = 'Open menu',
  className = '',
  triggerClassName = '',
}: DropdownMenuProps) => {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const place = () => {
    const button = triggerRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    // Prefer opening below-right of the trigger; flip left/up if it would overflow the viewport.
    let left = rect.right - MENU_WIDTH;
    if (left < MARGIN) left = Math.min(rect.left, window.innerWidth - MENU_WIDTH - MARGIN);

    const top = rect.bottom + 2;
    setPosition({ top, left: Math.max(MARGIN, left) });
  };

  useLayoutEffect(() => {
    if (open) place();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    // Any layout shift invalidates the fixed position; simplest correct behavior is to close.
    const onReflow = () => setOpen(false);

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onReflow);
    window.addEventListener('scroll', onReflow, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onReflow);
      window.removeEventListener('scroll', onReflow, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className={cn('flex h-full w-6 items-center justify-center hover:scale-125', triggerClassName)}
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          setOpen((value) => !value);
        }}
      >
        {trigger}
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: 'fixed', top: position.top, left: position.left, width: MENU_WIDTH }}
            className={cn(
              'z-50 overflow-hidden rounded border shadow-lg',
              'bg-white border-gray-300 text-gray-900',
              'dark:bg-eighties dark:border-gray-600 dark:text-gray-100',
              className,
            )}
            onClick={(event) => event.stopPropagation()}
          >
            {items.map((item, index) => (
              <button
                key={index}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  item.danger
                    ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950'
                    : 'hover:bg-blue-100 dark:hover:bg-blue-700',
                )}
                onClick={(event) => {
                  event.stopPropagation();
                  event.preventDefault();
                  setOpen(false);
                  item.onSelect();
                }}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
};

export default DropdownMenu;
