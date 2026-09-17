import React, { useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { cn } from '@src/shared/tools/cn';
import { selectedLogs$, logsFilter$ } from '../_hooks';
import { getNexIndex } from '@src/shared/facelessComponents/useListNavigation';
import { focusGlobalStateList, logsListClass } from '@src/pages/main_tab/util/listFocusBridge';
import { LogsFilter } from '../LogsFilter';
import { LogListItem, logListItemClass } from '../LogListItem';
import { filterLogCallback } from '../_utils';
import { logsArray$ } from '@src/pages/main_tab/hooks/logsArray';
import type { StateLog } from '@src/pages/main_tab/hooks/globalStates/helpers/useGlobalStates.types';
import { UnsubscribeCallback } from 'react-hooks-global-states';

export type LogsListProps = React.HTMLAttributes<HTMLDivElement>;

export const LogsList: React.FC<LogsListProps> = ({ className = '', ...props }: LogsListProps) => {
  const [logsFilter] = logsFilter$();
  const mainListRef = useRef<HTMLUListElement | null>(null);
  const recordsCountRef = useRef<HTMLParagraphElement | null>(null);
  const emptyLegendRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const listEl = mainListRef.current!;

    function onListClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const row = target?.closest(`.${logListItemClass}`);
      if (!row?.id) return;

      selectItem(row);
    }

    function selectItem(row: Element) {
      const logs = logsArray$.getState();
      const index = logs.findIndex((log) => log.logId === row.id);
      if (index === -1) return;

      selectedLogs$.setState([logs[index - 1] ?? null, logs[index]]);
      row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      (row as HTMLElement).focus();
    }

    function onListKeydown(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        focusGlobalStateList();
        return;
      }

      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

      const rows = Array.from(listEl.querySelectorAll(`.${logListItemClass}`));
      if (!rows.length) return;

      event.preventDefault();

      const [, selectedLog] = selectedLogs$.getState();
      const foundIndex = rows.findIndex((row) => row.id === selectedLog?.logId);
      const hasSelection = foundIndex !== -1;
      const selectedIndex = hasSelection ? foundIndex : 0;

      const keyDirection = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = getNexIndex({ navigationItems: rows, selectedIndex, keyDirection });

      selectItem(rows[nextIndex]);
    }

    listEl.addEventListener('click', onListClick);
    listEl.addEventListener('keydown', onListKeydown);

    // Local render state. logsArray$ replaces the whole array on every emission,
    // so we diff by tracking how many logs we've already turned into rows.
    let consumedTotal = 0;
    let renderedCount = 0;
    let lastRenderedLogId: string | null = null;

    const itemRoots: Root[] = [];

    const filter = logsFilter?.trim() ?? '';

    dropAll();

    const unsubscribe: UnsubscribeCallback = logsArray$.subscribe((logs) => {
      if (!logs.length) return dropAll();

      const isAppend =
        logs.length >= consumedTotal &&
        (consumedTotal === 0 || logs[consumedTotal - 1]?.logId === lastRenderedLogId);

      if (!isAppend) dropAll();

      appendFrom(logs, consumedTotal);
      updateListLabelsAndLegend(logs.length);
    });

    function appendFrom(logs: StateLog[], from: number) {
      const fragment = document.createDocumentFragment();

      for (let index = from; index < logs.length; index++) {
        appendRow(logs[index], fragment);
        consumedTotal = index + 1;
        lastRenderedLogId = logs[index].logId;
      }

      listEl.appendChild(fragment);
    }

    function dropAll() {
      unmountRoots();

      listEl.innerHTML = '';
      consumedTotal = 0;
      renderedCount = 0;
      lastRenderedLogId = null;
    }

    function unmountRoots() {
      const roots = itemRoots.splice(0, itemRoots.length);

      // React disallows unmounting a root synchronously from within its own render.
      queueMicrotask(() => {
        for (const root of roots) root.unmount();
      });
    }

    function updateListLabelsAndLegend(total: number) {
      const countEl = recordsCountRef.current;
      if (countEl) {
        const isFiltered = total !== renderedCount;
        countEl.textContent = `Records: ${isFiltered ? `${renderedCount} of ${total}` : renderedCount}`;
      }

      const legendEl = emptyLegendRef.current;
      if (legendEl) {
        const isEmpty = filter !== '' && renderedCount === 0;
        legendEl.style.display = isEmpty ? 'flex' : 'none';
      }
    }

    function appendRow(log: StateLog, parent: Node) {
      const isExcluded = filterLogCallback(filter, log);
      if (isExcluded) return;

      renderedCount += 1;

      const rowMount = createDisplayContentsMount();
      parent.appendChild(rowMount);

      const root = createRoot(rowMount);
      itemRoots.push(root);
      root.render(
        <>
          <li
            className={cn(
              { 'first:border-none': renderedCount === 1 },
              'border-b border-gray-400 text-gray-900 dark:border-gray-100',
            )}
          />
          <LogListItem logId={log.logId} index={log.index + 1} />
        </>,
      );
    }

    // Each row gets its own React root, but React must own the container element
    // and LogListItem renders its own <li>. `display: contents` makes this
    // wrapper vanish from layout so the inner <li> participates in the <ul> flex.
    function createDisplayContentsMount() {
      const mount = document.createElement('div');
      mount.style.display = 'contents';
      return mount;
    }

    return () => {
      listEl.removeEventListener('click', onListClick);
      listEl.removeEventListener('keydown', onListKeydown);
      unsubscribe?.();
      unmountRoots();
    };
  }, [logsFilter]);

  return (
    <div className={cn(logsListClass, 'flex flex-col', className)} {...props}>
      <div className="sticky top-0 z-10">
        <p
          ref={recordsCountRef}
          className="RecordsCount border-b border-gray-400 px-2 py-1 text-[9px] text-gray-500 dark:text-gray-400"
        >
          Records: 0
        </p>

        <LogsFilter className="border-b border-gray-400 w-full" />

        <p
          ref={emptyLegendRef}
          style={{ display: 'none' }}
          className="gap-4 p-2 transition-colors duration-300 text-gray-400"
        >
          No logs match the query...
        </p>
      </div>

      <ul
        ref={mainListRef}
        tabIndex={0}
        className="flex-1 min-h-0 flex flex-col overflow-y-scroll outline-none"
      />
    </div>
  );
};

export default LogsList;
