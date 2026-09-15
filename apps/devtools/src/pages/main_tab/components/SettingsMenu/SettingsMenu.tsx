import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@src/shared/tools/cn';
import { GoGear } from 'react-icons/go';
import { FiDownload, FiUpload } from 'react-icons/fi';
import { MdDarkMode, MdLightMode } from 'react-icons/md';
import theme$ from '../../hooks/theme';
import { downloadGlobalStatesSnapshot, promptLoadGlobalStatesFromFile } from '@main_tab/util/globalStatesFile';

export type SettingsMenuProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * Gear button that opens a dropdown with panel-level actions:
 *  - Toggle theme (light/dark)
 *  - Load a states snapshot from a JSON file
 *  - Download the current states as a JSON snapshot
 */
export const SettingsMenu: React.FC<SettingsMenuProps> = ({ className = '', ...props }: SettingsMenuProps) => {
  const [theme] = theme$();
  const isLight = theme === 'light';
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(
    function closeOnOutsideClick() {
      if (!open) return;

      const onPointerDown = (event: MouseEvent) => {
        if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
      };
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') setOpen(false);
      };

      document.addEventListener('mousedown', onPointerDown);
      document.addEventListener('keydown', onKeyDown);
      return () => {
        document.removeEventListener('mousedown', onPointerDown);
        document.removeEventListener('keydown', onKeyDown);
      };
    },
    [open]
  );

  const runAndClose = (action: () => void) => () => {
    setOpen(false);
    action();
  };

  const itemClassName = cn('flex w-full items-center gap-2 px-3 py-2 text-left text-sm', {
    'text-gray-900 hover:bg-blue-100': isLight,
    'text-gray-100 hover:bg-blue-700': !isLight,
  });

  return (
    <div ref={containerRef} className={cn('relative', className)} {...props}>
      <button
        type="button"
        className="px-4"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        title="Settings"
      >
        <GoGear />
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute right-0 z-20 mt-1 min-w-44 overflow-hidden rounded border shadow-lg',
            isLight ? 'bg-white border-gray-300' : 'bg-eighties border-gray-600'
          )}
        >
          <button type="button" role="menuitem" className={itemClassName} onClick={runAndClose(theme$.actions.toggleTheme)}>
            {isLight ? <MdDarkMode /> : <MdLightMode />}
            {isLight ? 'Dark theme' : 'Light theme'}
          </button>

          <button
            type="button"
            role="menuitem"
            className={itemClassName}
            onClick={runAndClose(promptLoadGlobalStatesFromFile)}
          >
            <FiUpload />
            Load snapshot
          </button>

          <button
            type="button"
            role="menuitem"
            className={itemClassName}
            onClick={runAndClose(downloadGlobalStatesSnapshot)}
          >
            <FiDownload />
            Download snapshot
          </button>
        </div>
      )}
    </div>
  );
};

export default SettingsMenu;
