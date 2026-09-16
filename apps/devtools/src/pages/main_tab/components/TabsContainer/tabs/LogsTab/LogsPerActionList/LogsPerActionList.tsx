import React, { useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { generateActionId, type ActionId } from '@src/shared/schema';
import { cn } from '@src/shared/tools/cn';
import { logsFilter$, selectedActionHeader$ } from '../_hooks';
import { LogsFilter } from '../LogsFilter';
import { ActionLogListItem, actionLogListItemClass } from '../ActionLogListItem';
import { getNexIndex } from '@src/shared/facelessComponents/useListNavigation';
import { isEqualRoot } from '@src/pages/main_tab/hooks/globalStates/hooks/useActionsHeaders';
import selectedGlobalStateId$ from '@src/pages/main_tab/hooks/selectedGlobalStateId';
import { UnsubscribeCallback } from 'react-hooks-global-states';
import { actionIdsByStateId$, actionsById$ } from '@src/pages/main_tab/hooks/globalStates';

export type LogsPerActionListProps = React.HTMLAttributes<HTMLDivElement>;

export const LogsPerActionList: React.FC<LogsPerActionListProps> = ({
  className = '',
  ...props
}: LogsPerActionListProps) => {
  const [logsFilter] = logsFilter$();
  const mainListRef = useRef<HTMLUListElement | null>(null);
  const recordsCountRef = useRef<HTMLParagraphElement | null>(null);
  const emptyLegendRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const listEl = mainListRef.current!;

    function onListClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const row = target?.closest(`.${actionLogListItemClass}`);
      if (!generateActionId.is(row?.id)) return;

      selectItem(row);
    }

    function selectItem(row: Element) {
      selectedActionHeader$.setState(row.id as ActionId);
      row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      (row as HTMLElement).focus();
    }

    function onListKeydown(event: KeyboardEvent) {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

      const rows = Array.from(listEl.querySelectorAll(`.${actionLogListItemClass}`));
      if (!rows.length) return;

      event.preventDefault();

      const selectedId = selectedActionHeader$.getState();
      const foundIndex = rows.findIndex((row) => row.id === selectedId);
      const hasSelection = foundIndex !== -1;
      const selectedIndex = hasSelection ? foundIndex : 0;

      const keyDirection = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = getNexIndex({ navigationItems: rows, selectedIndex, keyDirection });

      selectItem(rows[nextIndex]);
    }

    listEl.addEventListener('click', onListClick);
    listEl.addEventListener('keydown', onListKeydown);

    // Local render state. Kept out of React on purpose: this list can receive
    // thousands of appends and we only ever touch the DOM for the delta.
    let isFirstRender = true;
    let previousLastActionId: ActionId | null = null;
    let totalCount = 0;
    let renderedCount = 0;
    let unsubscribeActions: UnsubscribeCallback | undefined;

    const itemRoots: Root[] = [];

    const filter = logsFilter?.trim().toLowerCase() ?? '';

    dropAll();

    const unsubscribeSelected = selectedGlobalStateId$.subscribe((selectedStateId) => {
      // The selected store changed (or was cleared) -> the whole list is dropped.
      // Actions are only ever appended within a store, never deleted individually
      unsubscribeActions?.();
      dropAll();

      if (!selectedStateId) return;

      unsubscribeActions = actionIdsByStateId$.subscribe(
        (actionIdsByStateId) => {
          const actionIds = actionIdsByStateId.get(selectedStateId);
          if (!actionIds?.size) return dropAll();

          const lastActionId = Array.from(actionIds).at(-1)!;
          const isNewActionAdded = lastActionId !== previousLastActionId;
          if (!isNewActionAdded) return;
          previousLastActionId = lastActionId;

          // First paint for this store: render everything in one batch.
          if (isFirstRender) {
            isFirstRender = false;
            const fragment = document.createDocumentFragment();
            for (const actionId of actionIds) appendRow(actionId, fragment);
            listEl.appendChild(fragment);
            updateListLabelsAndLegend();
            return;
          }

          // Steady state: only the newest action needs a row.
          appendRow(lastActionId, listEl);
          updateListLabelsAndLegend();
        },
        {
          isEqualRoot: isEqualRoot(selectedStateId),
        },
      );
    });

    function dropAll() {
      unmountRoots();

      listEl.innerHTML = '';
      totalCount = 0;
      renderedCount = 0;
      isFirstRender = true;
      previousLastActionId = null;
      updateListLabelsAndLegend();
    }

    function unmountRoots() {
      const roots = itemRoots.splice(0, itemRoots.length);

      // React disallows unmounting a root synchronously from within its own render.
      queueMicrotask(() => {
        for (const root of roots) root.unmount();
      });
    }

    function updateListLabelsAndLegend() {
      const countEl = recordsCountRef.current;
      if (countEl) {
        const isFiltered = totalCount !== renderedCount;
        countEl.textContent = `Records: ${isFiltered ? `${renderedCount} of ${totalCount}` : renderedCount}`;
      }

      const legendEl = emptyLegendRef.current;
      if (legendEl) {
        const isEmpty = filter !== '' && renderedCount === 0;
        legendEl.style.display = isEmpty ? 'flex' : 'none';
      }
    }

    function appendRow(actionId: ActionId, parent: Node) {
      const action = actionsById$.getState().get(actionId);
      if (!action) return;

      totalCount += 1;

      const shouldRenderNode = !filter || action.action.toLowerCase().includes(filter);
      if (!shouldRenderNode) return;

      renderedCount += 1;

      const rowMount = createDisplayContentsMount();
      parent.appendChild(rowMount);

      const root = createRoot(rowMount);
      itemRoots.push(root);
      root.render(
        <ActionLogListItem
          actionId={actionId}
          index={renderedCount}
          className="border-b border-gray-400 last-of-type:border-none"
        />,
      );
    }

    // Each row gets its own React root, but React must own the container element
    // and ActionLogListItem renders its own <li>. `display: contents` makes this
    // wrapper vanish from layout so the inner <li> participates in the <ul> flex
    // directly.
    function createDisplayContentsMount() {
      const mount = document.createElement('div');
      mount.style.display = 'contents';
      return mount;
    }

    return () => {
      listEl.removeEventListener('click', onListClick);
      listEl.removeEventListener('keydown', onListKeydown);
      unsubscribeActions?.();
      unsubscribeSelected?.();
      unmountRoots();
    };
  }, [logsFilter]);

  return (
    <div className={cn('LogsPerActionList flex flex-col', className)} {...props}>
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

export default LogsPerActionList;
