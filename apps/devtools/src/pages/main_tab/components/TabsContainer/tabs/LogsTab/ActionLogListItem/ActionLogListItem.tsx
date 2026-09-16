import React from 'react';
import { cn } from '@src/shared/tools/cn';
import { toHeader, useActionJson } from '@src/pages/main_tab/hooks/globalStates/hooks';
import type { ActionId } from '@src/shared/schema';
import { formatTimeToHHMMSS } from '@src/shared/tools/date';
import { useIsSelectedHeader } from '../_hooks';
import { theme$ } from '@src/pages/main_tab/hooks/theme';
import selectedGlobalStateId$ from '@src/pages/main_tab/hooks/selectedGlobalStateId';
import { DATA_LIST_SELECTED } from '@src/pages/main_tab/util/listFocusBridge';
import { DropdownMenuLog } from './components';

export type ActionLogListItemProps = React.HTMLAttributes<HTMLLIElement> & {
  actionId: ActionId;
  index: number;
};

export const actionLogListItemClass = 'ActionLogListItem';

export const ActionLogListItem: React.FC<ActionLogListItemProps> = ({
  className = '',
  actionId,
  index,
  ...props
}: ActionLogListItemProps) => {
  const [selectedStateId] = selectedGlobalStateId$();

  const action = useActionJson({ stateId: selectedStateId, actionId });
  const [isSelectedAction] = useIsSelectedHeader(actionId);
  const [theme] = theme$();

  if (!action) return null;

  const header = toHeader(action);
  const dateString = formatTimeToHHMMSS(header.timestamp);
  const title = `${dateString} / ${header.action}`;

  return (
    <li
      id={actionId}
      tabIndex={-1}
      {...(isSelectedAction ? { [DATA_LIST_SELECTED]: true } : {})}
      {...props}
      title={title}
      className={cn(
        actionLogListItemClass,
        'relative w-full gap-2 px-1 py-2 transition-colors duration-300',
        'flex justify-start items-center select-text cursor-pointer',
        {
          '!text-red-500': header.hasError,
          'border-l-4 border-blue-500': isSelectedAction,
          'text-gray-900': theme === 'light',
          'text-gray-100': theme !== 'light',
          'bg-blue-100': isSelectedAction && theme === 'light',
          'bg-blue-700': isSelectedAction && theme !== 'light',
          'hover:bg-blue-200': !isSelectedAction && theme === 'light',
          'hover:bg-blue-600': !isSelectedAction && theme !== 'light',
        },
        className,
      )}
    >
      <button className="">
        <span
          className={cn('font-semibold', {
            'text-green-500': !header.hasError && header.actionType === 'LIFE_CYCLE',
            'text-orange-500': !header.hasError && header.actionType === 'LIFE_CYCLE_PARAMETER',
          })}
        >
          <span className={cn('text-xxs', 'text-gray-500 dark:text-white')}>{index}.</span> {header.action}
        </span>

        {header.hasError && <span className="text-red-500 text-xxs">❌</span>}
      </button>

      <span className={cn('flex-1 text-xxs whitespace-nowrap text-right text-gray-800 dark:text-white')}>
        {formatTimeToHHMMSS(header.timestamp ?? Date.now())}
      </span>

      <DropdownMenuLog header={header} />
    </li>
  );
};

export default ActionLogListItem;
