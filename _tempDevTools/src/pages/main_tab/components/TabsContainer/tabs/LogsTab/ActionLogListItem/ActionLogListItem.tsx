import React from 'react';
import { cn } from '@src/shared/tools/cn';
import { type ActionHeader } from '@src/pages/main_tab/hooks/globalStates/hooks/useActionsHeaders';
import { type NavItem } from '@src/shared/facelessComponents/useListNavigation';
import { formatTimeToHHMMSS } from '@src/shared/tools/date';
import { useIsSelectedHeader } from '../_hooks';
import { theme$ } from '@src/pages/main_tab/hooks/theme';
import { DropdownMenuLog } from './components';

export type ActionLogListItemProps = React.HTMLAttributes<HTMLLIElement> & {
  header: NavItem<ActionHeader>;
};

export const ActionLogListItem: React.FC<ActionLogListItemProps> = ({
  className = '',
  header,
  ...props
}: ActionLogListItemProps) => {
  const [isSelectedAction] = useIsSelectedHeader(header.value.actionId);
  const dateString = formatTimeToHHMMSS(header.value.timestamp);
  const title = `${dateString} / ${header.value.action}`;
  const [theme] = theme$();

  return (
    <li
      {...props}
      title={title}
      className={cn(
        'ListItemLogGroup relative',
        'w-full gap-2 px-1 py-2 transition-colors duration-300',
        'flex justify-start items-center select-text cursor-pointer',
        {
          '!text-red-500': header.value.hasError,
          'border-l-4 border-blue-500': isSelectedAction,
          'text-gray-900': theme === 'light',
          'text-gray-100': theme !== 'light',
          'bg-blue-100': isSelectedAction && theme === 'light',
          'bg-blue-700': isSelectedAction && theme !== 'light',
          'hover:bg-blue-200': !isSelectedAction && theme === 'light',
          'hover:bg-blue-600': !isSelectedAction && theme !== 'light',
        },
        className
      )}
    >
      <button className="">
        <span
          className={cn('text-xxs whitespace-nowrap', 'top-0.5 right-0.5 absolute ', 'text-gray-800 dark:text-white')}
        >
          {
            // eslint-disable-next-line react-hooks/purity
            formatTimeToHHMMSS(header.value.timestamp ?? Date.now())
          }
        </span>

        <span
          className={cn('font-semibold', {
            'text-green-500': !header.value.hasError && header.value.actionType === 'LIFE_CYCLE',
            'text-orange-500': !header.value.hasError && header.value.actionType === 'LIFE_CYCLE_PARAMETER',
          })}
        >
          <span className={cn('text-xxs', 'text-gray-500 dark:text-white')}>{header.props.tabIndex + 1}.</span>{' '}
          {header.value.action}
        </span>

        {header.value.hasError && <span className="text-red-500 text-xxs">❌</span>}
      </button>

      <DropdownMenuLog header={header.value} />
    </li>
  );
};

export default ActionLogListItem;
