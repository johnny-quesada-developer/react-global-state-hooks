import React, { useEffect, useRef } from 'react';
import { cn } from '@src/shared/tools/cn';

export type ModalProps = {
  /** Controls visibility. When true the dialog is shown modally. */
  open: boolean;
  /** Called when the user dismisses (Escape, backdrop click, or close button). */
  onClose: () => void;
  /** Optional heading rendered at the top of the dialog. */
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/**
 * Small modal dialog built on the native <dialog> element, so it gets focus trapping, the top
 * layer, and Escape-to-close for free. Styling follows the panel's light/dark convention via
 * `dark:` variants (the theme toggles a class on <html>).
 */
export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, className = '' }: ModalProps) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Native <dialog> fires 'close' on Escape; keep React state in sync.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      // Clicking the backdrop (the dialog element itself, outside its content) closes it.
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className={cn(
        'm-auto w-[28rem] max-w-[90vw] rounded-lg border p-0 shadow-xl backdrop:bg-black/40',
        'bg-white text-gray-900 border-gray-300',
        'dark:bg-eighties dark:text-gray-100 dark:border-gray-600',
        className,
      )}
    >
      <div className="flex flex-col gap-3 p-4">
        {title != null && <h2 className="text-base font-semibold">{title}</h2>}
        <div className="text-sm leading-relaxed">{children}</div>
      </div>
    </dialog>
  );
};

export default Modal;
