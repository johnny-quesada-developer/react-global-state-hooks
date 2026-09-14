import React, { useEffect, useMemo, useRef } from 'react';
import { cn } from '@src/shared/tools/cn';
import isNil from 'json-storage-formatter/isNil';
import { assertIsNonNullable, isFunction } from '@src/shared/asserts/asserts';

export type TooltipAPI = {
  open: () => void;
  close: () => void;
  toggle: () => void;
};

export type TooltipProps = Omit<React.HTMLAttributes<HTMLButtonElement>, 'children'> & {
  children: React.ReactNode | ((api: TooltipAPI) => React.ReactNode);
  tooltip: React.ReactNode | ((api: TooltipAPI) => React.ReactNode);
  tooltipProps?: React.HTMLAttributes<HTMLDialogElement>;
  autoClose?: boolean;
  trigger?: 'click' | 'hover';
};

/**
 * By default opens the tooltip to the bottom right of the button
 * If there is not enough space, it will open bottom left
 */
const calculatePositionStyles = (button: HTMLButtonElement, dialog: HTMLDialogElement): React.CSSProperties => {
  const buttonRec = button.getBoundingClientRect();
  const dialogRec = dialog.getBoundingClientRect();

  const marginTop = buttonRec.top + buttonRec.height;

  let marginLeft = buttonRec.left;

  const rightMargin = 10;
  const doesPositionOverflowsRight = marginLeft + dialogRec.width >= window.innerWidth - rightMargin;
  const diff = doesPositionOverflowsRight ? marginLeft + dialogRec.width - window.innerWidth + rightMargin : 0;

  marginLeft -= diff;

  return {
    marginTop: `${marginTop}px`,
    marginLeft: `${marginLeft}px`,
  };
};

export const Tooltip: React.FC<TooltipProps> = ({
  className,
  children,
  tooltip,
  tooltipProps: { className: tooltipClassName = '', ...tooltipProps } = {},
  autoClose,
  ...props
}: TooltipProps) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const [dialog, setDialog] = React.useState<HTMLDialogElement | null>(null);
  const [button, setButton] = React.useState<HTMLButtonElement | null>(null);

  useEffect(() => {
    setDialog(dialogRef.current);
    setButton(buttonRef.current);
  }, []);

  const tooltipAPI: TooltipAPI | null = useMemo(() => {
    if (isNil(dialog) || isNil(button)) return null;

    const open = () => {
      assertIsNonNullable(dialog, 'dialogRef.current');
      assertIsNonNullable(button, 'buttonRef.current');

      // need to remove the hidden to see the dimensions
      dialog.classList.remove('hidden');

      const _styles = calculatePositionStyles(button, dialog);

      Object.assign(dialog.style, _styles);

      dialog.showModal();
    };

    const close = () => {
      assertIsNonNullable(dialog, 'dialogRef.current');

      dialog.close();

      dialog.classList.add('hidden');
    };

    const toggle = () => {
      assertIsNonNullable(dialog, 'dialogRef.current');

      if (dialog.open) return close();

      open();
    };

    return {
      open,
      close,
      toggle,
    };
  }, [button, dialog]);

  useEffect(() => {
    if (isNil(tooltipAPI)) return;
    if (!autoClose) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      assertIsNonNullable(dialog, 'dialogRef.current');

      if (dialog.contains(event.target as Node)) return;

      tooltipAPI.close();
    };

    document.addEventListener('click', closeOnOutsideClick);

    return () => {
      document.removeEventListener('click', closeOnOutsideClick);
    };
  }, [autoClose, dialog, tooltipAPI]);

  // useEffect(() => {
  //   if (isNil(tooltipAPI) || isNil(button)) return;
  //   if (trigger === 'click') return;

  //   if (trigger === 'hover') {
  //     button?.addEventListener('mouseenter', tooltipAPI.open);
  //     button?.addEventListener('mouseleave', tooltipAPI.close);
  //   }

  //   return () => {
  //     button?.removeEventListener('mouseenter', tooltipAPI.open);
  //     button?.removeEventListener('mouseleave', tooltipAPI.close);
  //   };
  // }, [tooltipAPI, button, trigger]);

  const childrenElement = (() => {
    if (isNil(tooltipAPI)) return null;

    return isFunction(children) ? children(tooltipAPI) : children;
  })();

  const tooltipElement = (() => {
    if (isNil(tooltipAPI)) return null;

    return isFunction(tooltip) ? tooltip(tooltipAPI) : tooltip;
  })();

  return (
    <button ref={buttonRef} className={cn((className = ''))} {...props} onClick={tooltipAPI?.toggle}>
      {childrenElement}
      <dialog
        ref={dialogRef}
        // eslint-disable-next-line tailwindcss/no-arbitrary-value
        className={cn(
          // caller styles first so the component keeps control of visibility/position:
          // `hidden` (toggled open/closed via JS) must win over any caller `flex`/`block`.
          tooltipClassName,
          'hidden',
          'absolute z-20',
          'open:animate-[dropDown_0.4s_ease-in-out] backdrop:bg-transparent'
        )}
        {...tooltipProps}
      >
        {tooltipElement}
      </dialog>
    </button>
  );
};

export default Tooltip;
