import React from 'react';
import clsx from 'clsx';
import { cn } from '@src/shared/tools/cn';
import { actionLabel, selectableRow } from '@src/shared/tools';
import { useIsSelectedLog } from '../_hooks';
import { useLog } from '@src/pages/main_tab/hooks/logsArray';
import { formatTimeToHHMMSS } from '@src/shared/tools/date';
import { DATA_LIST_SELECTED } from '@src/pages/main_tab/util/listFocusBridge';
import { DropdownMenuLog } from './components';

export const logListItemClass = 'ListItemLog';

export type LogListItemProps = React.HTMLAttributes<HTMLLIElement> & {
  logId: string;
  index: number;
};

export const LogListItem = ({ className = '', logId, index, ...props }: LogListItemProps) => {
  const log = useLog(logId);
  const [isSelectedLog] = useIsSelectedLog(logId);

  if (!log) return null;

  const dateString = formatTimeToHHMMSS(log.timestamp);
  const title = `${dateString} / ${log.parentAction} / ${log.subAction ?? log.case}`;
  const isRejected = log.case === 'rejected';

  return (
    <li
      data-testid="log-item"
      data-log-action={log.parentAction}
      id={logId}
      tabIndex={-1}
      {...(isSelectedLog ? { [DATA_LIST_SELECTED]: true } : {})}
      {...props}
      title={title}
      className={clsx(
        logListItemClass,
        selectableRow({ selected: isSelectedLog, error: isRejected }),
        className,
      )}
    >
      <button className="text-start flex-1">
        <span className={actionLabel({ actionType: log.parentActionType, error: isRejected })}>
          <span className={cn('text-xxs', 'text-gray-500 dark:text-white')}>{index}.</span> {log.parentAction}
        </span>

        <span>/ {log.subAction ?? log.case}</span>
        {isRejected && <span className="text-red-500 text-xxs">❌</span>}
      </button>

      <span className={cn('z-10', 'text-xxs', 'whitespace-nowrap', 'text-gray-800 dark:text-white')}>
        {dateString}
      </span>

      <DropdownMenuLog className="" log={log} />
    </li>
  );
};

export default LogListItem;
