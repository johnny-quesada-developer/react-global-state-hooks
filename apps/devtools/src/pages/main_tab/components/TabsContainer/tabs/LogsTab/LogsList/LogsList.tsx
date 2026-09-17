import React from 'react';
import { selectedLogs$, logsFilter$ } from '../_hooks';
import { logsListClass } from '@src/pages/main_tab/util/listFocusBridge';
import { LogListItem, logListItemClass } from '../LogListItem';
import { filterLogCallback } from '../_utils';
import { logsArray$ } from '@src/pages/main_tab/hooks/logsArray';
import { ManualDomListShell, ManualDomRow, useManualDomList } from '../_manualDomList';

export type LogsListProps = React.HTMLAttributes<HTMLDivElement>;

export const LogsList: React.FC<LogsListProps> = ({ className = '', ...props }: LogsListProps) => {
  const [logsFilter] = logsFilter$();
  const filter = logsFilter?.trim() ?? '';

  const { mainListRef, recordsCountRef, emptyLegendRef } = useManualDomList({
    rowClass: logListItemClass,
    dependencies: [logsFilter],

    getSelectedId: () => selectedLogs$.getState()[1]?.logId ?? null,

    selectById: (logId) => {
      const logs = logsArray$.getState();
      const index = logs.findIndex((log) => log.logId === logId);
      if (index === -1) return;

      selectedLogs$.setState([logs[index - 1] ?? null, logs[index]]);
    },

    subscribe: (controller) => {
      // logsArray$ replaces the whole array on every emission, so diff by how
      // many logs we've already turned into rows.
      let consumedTotal = 0;
      let renderedCount = 0;
      let lastRenderedLogId: string | null = null;

      const reset = () => {
        controller.dropAll();
        consumedTotal = 0;
        renderedCount = 0;
        lastRenderedLogId = null;
      };

      reset();

      return logsArray$.subscribe((logs) => {
        if (!logs.length) {
          reset();
          return controller.updateCounts({ total: 0, rendered: 0, hasFilter: filter !== '' });
        }

        const isAppend =
          logs.length >= consumedTotal &&
          (consumedTotal === 0 || logs[consumedTotal - 1]?.logId === lastRenderedLogId);

        if (!isAppend) reset();

        const fragment = document.createDocumentFragment();

        for (let index = consumedTotal; index < logs.length; index++) {
          const log = logs[index];
          consumedTotal = index + 1;
          lastRenderedLogId = log.logId;

          if (filterLogCallback(filter, log)) continue;

          renderedCount += 1;
          controller.appendItem(
            <ManualDomRow isFirst={renderedCount === 1}>
              <LogListItem logId={log.logId} index={log.index + 1} />
            </ManualDomRow>,
            fragment,
          );
        }

        controller.listEl.appendChild(fragment);
        controller.updateCounts({ total: logs.length, rendered: renderedCount, hasFilter: filter !== '' });
      });
    },
  });

  return (
    <ManualDomListShell
      className={className}
      containerClass={logsListClass}
      mainListRef={mainListRef}
      recordsCountRef={recordsCountRef}
      emptyLegendRef={emptyLegendRef}
      {...props}
    />
  );
};

export default LogsList;
