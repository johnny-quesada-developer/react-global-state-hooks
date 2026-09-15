import React from 'react';
import { cn } from '@src/shared/tools/cn';
import { GoGear } from 'react-icons/go';
import selectedGlobalStateId$ from '../../hooks/selectedGlobalStateId';
import { selectedTab$, TopNavigationValue } from '../../hooks/selectedTab';
import theme$ from '../../hooks/theme';
import globalStates$ from '../../hooks/globalStates';

export type NavBarProps = React.HTMLAttributes<HTMLUListElement> & Record<string, unknown>;

export const NavBar: React.FC<NavBarProps> = ({ className = '', ...props }: NavBarProps) => {
  const [selectedStore] = selectedGlobalStateId$();
  const [selectedTab, setSelectedTab] = selectedTab$();
  const [theme] = theme$();
  const isLight = theme === 'light';

  const options = [
    { label: 'Logs', value: 'logs' },
    { label: 'State', value: 'state' },
    { label: 'Actions', value: 'actions' },

    ...(process.env.NODE_ENV === 'development' && globalStates$.getMetadata().logMessages
      ? [{ label: 'Messages', value: 'messages' }]
      : []),
  ] as {
    label: string;
    value: TopNavigationValue;
  }[];

  return (
    <ul className={cn('flex justify-end', className)} {...props}>
      {options.map(({ label, value }) => (
        <li
          key={value}
          className={cn('relative flex justify-start p-2 cursor-pointer', {
            'border-l-4 border-blue-500': selectedTab === value,
            // Background and text both follow the theme so the active tab's label
            // stays legible in both modes (light bg + dark text / dark bg + light text).
            'text-gray-900': isLight,
            'text-gray-100': !isLight,
            'bg-blue-100': selectedTab === value && isLight,
            'bg-blue-700': selectedTab === value && !isLight,
            'hover:bg-blue-200': selectedTab !== value && isLight,
            'hover:bg-blue-600': selectedTab !== value && !isLight,
          })}
        >
          <button
            className={cn('px-4', {
              'cursor-not-allowed': !selectedStore,
            })}
            disabled={!selectedStore}
            onClick={() => setSelectedTab(value)}
            title={selectedStore ? `Switch to ${label} tab` : 'Select a store to view its details.'}
          >
            {label}
          </button>
        </li>
      ))}

      <li className="relative flex justify-start p-2 cursor-pointer">
        <button
          className="px-4"
          disabled={!selectedStore}
          onClick={theme$.actions.toggleTheme}
          title={selectedStore ? 'Settings' : 'Select a store to view its details.'}
        >
          <GoGear />
        </button>
      </li>
    </ul>
  );
};

export default NavBar;
