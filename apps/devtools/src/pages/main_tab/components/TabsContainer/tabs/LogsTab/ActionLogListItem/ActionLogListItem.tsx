import React from 'react';
import clsx from 'clsx';
import { cn } from '@src/shared/tools/cn';
import { actionLabel, selectableRow } from '@src/shared/tools';
import { toHeader, useActionJson } from '@src/pages/main_tab/hooks/globalStates/hooks';
import type { ActionId } from '@src/shared/schema';
import { formatTimeToHHMMSS } from '@src/shared/tools/date';
import { useIsSelectedHeader } from '../_hooks';
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
      className={clsx(
        actionLogListItemClass,
        selectableRow({
          selected: isSelectedAction,
          error: header.hasError,
        }),
        className,
      )}
    >
      <button className="">
        <span className={actionLabel({ actionType: header.actionType, error: header.hasError })}>
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
