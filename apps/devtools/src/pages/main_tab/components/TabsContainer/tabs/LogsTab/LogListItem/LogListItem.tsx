import React from 'react';
import { cn } from '@src/shared/tools/cn';
import { useIsSelectedLog } from '../_hooks';
import { StateLog } from '@src/pages/main_tab/hooks/globalStates/helpers/useGlobalStates.types';
import type { NavItem } from '@src/shared/facelessComponents/useListNavigation';
import { formatTimeToHHMMSS } from '@src/shared/tools/date';
import { theme$ } from '@src/pages/main_tab/hooks/theme';
import { DropdownMenuLog } from './components';

export type LogListItemProps = React.HTMLAttributes<HTMLLIElement> & {
  navItem: NavItem<StateLog>;
};

export const LogListItem = ({ className = '', navItem, ...props }: LogListItemProps) => {
  const [isSelectedLog] = useIsSelectedLog(navItem.value?.logId);
  const actionLog = navItem.value ?? {};
  const dateString = formatTimeToHHMMSS(actionLog.timestamp);
  const title = `${dateString} / ${actionLog.parentAction} / ${actionLog.subAction ?? actionLog.case}`;
  const isRejected = actionLog.case === 'rejected';
  const [theme] = theme$();

  return (
    <li
      {...props}
      title={title}
      {...navItem.props}
      className={cn(
        'ListItemLog',
        {
          'border-l-4 border-blue-500': isSelectedLog,
          'text-gray-900': theme === 'light',
          'text-gray-100': theme !== 'light',
          'bg-blue-100': isSelectedLog && theme === 'light',
          'bg-blue-700': isSelectedLog && theme !== 'light',
          'hover:bg-blue-200': !isSelectedLog && theme === 'light',
          'hover:bg-blue-600': !isSelectedLog && theme !== 'light',
        },
        'relative w-full flex gap-2 pl-4 py-2 transition-colors duration-300',
        'justify-start items-center select-text text-nowrap',
        className,
      )}
    >
      <button className="text-start flex-1">
        <span
          className={cn('font-semibold', {
            'text-red-500': isRejected,
            'text-green-500': !isRejected && actionLog.parentActionType === 'LIFE_CYCLE',
            'text-orange-500': !isRejected && actionLog.parentActionType === 'LIFE_CYCLE_PARAMETER',
          })}
        >
          <span className={cn('text-xxs', 'text-gray-500 dark:text-white')}>{actionLog.index + 1}.</span>{' '}
          {actionLog.parentAction}
        </span>

        <span
          className={cn('text-sm', {
            'text-red-500': isRejected,
          })}
        >
          / {actionLog.subAction ?? actionLog.case}
        </span>
        {isRejected && <span className="text-red-500 text-xxs">❌</span>}
      </button>

      <span className={cn('z-10', 'text-xxs', 'whitespace-nowrap', 'text-gray-800 dark:text-white')}>
        {dateString}
      </span>

      <DropdownMenuLog className="" log={actionLog} />
    </li>
  );
};

export default LogListItem;
