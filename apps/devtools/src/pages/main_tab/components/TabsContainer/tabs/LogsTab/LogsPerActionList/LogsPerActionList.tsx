import React, { useRef } from 'react';
import { cn } from '@src/shared/tools/cn';
import { logsFilter$, selectedActionHeader$ } from '../_hooks';
import { useListNavigation } from '@src/shared/facelessComponents/useListNavigation';
import { LogsFilter } from '../LogsFilter';
import { RecordsCount } from '../RecordsCount';
import { ActionLogListItem } from '../ActionLogListItem';
import { useActionsHeaders } from '@src/pages/main_tab/hooks/globalStates/hooks/useActionsHeaders';

export type LogsPerActionListProps = React.HTMLAttributes<HTMLDivElement>;

export const LogsPerActionList: React.FC<LogsPerActionListProps> = ({
  className = '',
  ...props
}: LogsPerActionListProps) => {
  const [logsFilter] = logsFilter$();
  const actionsHeaders = useActionsHeaders();
  const mainListRef = useRef<HTMLUListElement | null>(null);

  const navigation = useListNavigation(
    {
      name: 'logs-per-action-list',
      items: actionsHeaders,
      containerRef: mainListRef,
      filter: (item) => {
        if (!logsFilter) return false;

        return !item.action.toLowerCase().includes(logsFilter.toLowerCase());
      },
      onSelect: (item) => {
        if (!item) return;

        selectedActionHeader$.setState(item.value.actionId);
      },
    },
    [actionsHeaders, logsFilter],
  );

  return (
    <div className={cn('LogsPerActionList flex flex-col', className)} {...props}>
      <div className="sticky top-0 z-10">
        <RecordsCount
          className="border-b border-gray-400"
          count={navigation.navigationItems.length}
          total={actionsHeaders.length}
        />

        <LogsFilter className="border-b border-gray-400 w-full" />

        {!navigation.navigationItems.length && (
          <p className="flex gap-4 p-2 transition-colors duration-300 text-gray-400">
            No logs match the query...
          </p>
        )}
      </div>

      <ul ref={mainListRef} className="flex-1 min-h-0 flex flex-col overflow-y-scroll">
        {navigation.navigationItems.map((action) => {
          return (
            <ActionLogListItem
              key={action.key}
              header={action}
              {...action.props}
              className="border-b border-gray-400 last-of-type:border-none"
            />
          );
        })}
      </ul>
    </div>
  );
};

export default LogsPerActionList;
