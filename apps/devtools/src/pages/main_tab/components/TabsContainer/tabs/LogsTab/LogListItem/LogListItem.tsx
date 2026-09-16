import React from 'react';
import clsx from 'clsx';
import { cn } from '@src/shared/tools/cn';
import { actionLabel, selectableRow } from '@src/shared/tools';
import { useIsSelectedLog } from '../_hooks';
import { StateLog } from '@src/pages/main_tab/hooks/globalStates/helpers/useGlobalStates.types';
import type { NavItem } from '@src/shared/facelessComponents/useListNavigation';
import { formatTimeToHHMMSS } from '@src/shared/tools/date';
import { DATA_LIST_SELECTED } from '@src/pages/main_tab/util/listFocusBridge';
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

  return (
    <li
      {...props}
      title={title}
      {...navItem.props}
      {...(isSelectedLog ? { [DATA_LIST_SELECTED]: true } : {})}
      className={clsx(
        'ListItemLog',
        selectableRow({ selected: isSelectedLog, error: isRejected }),
        className,
      )}
    >
      <button className="text-start flex-1">
        <span className={actionLabel({ actionType: actionLog.parentActionType, error: isRejected })}>
          <span className={cn('text-xxs', 'text-gray-500 dark:text-white')}>{actionLog.index + 1}.</span>{' '}
          {actionLog.parentAction}
        </span>

        <span>/ {actionLog.subAction ?? actionLog.case}</span>
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
