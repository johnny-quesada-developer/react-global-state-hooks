import { useEffect, useRef, type ReactNode } from 'react';
import { getNexIndex } from '@src/shared/facelessComponents/useListNavigation';
import { focusGlobalStateList } from '@src/pages/main_tab/util/listFocusBridge';
import { ItemRoots } from './manualDomList.utils';

export type ManualDomListController = {
  /** Mount a row (its own React root) into the list, or a fragment for the first batch. */
  appendItem: (node: ReactNode, parent?: Node) => void;
  /** The list <ul>, so the caller can batch-append a DocumentFragment. */
  listEl: HTMLUListElement;
  /** Reset: unmount every row, clear the DOM, and refresh the counters. */
  dropAll: () => void;
  /** Refresh the "Records: N of M" label and the empty-query legend. */
  updateCounts: (args: { total: number; rendered: number; hasFilter: boolean }) => void;
};

type ManualDomListConfig = {
  /** Class present on each selectable row <li> (used for delegation + lookup). */
  rowClass: string;
  /** Current selection id, or null. Rows carry it as their DOM id. */
  getSelectedId: () => string | null;
  /** Commit a selection given the clicked/navigated row's id. */
  selectById: (id: string) => void;
  /** Optional Arrow Right handler, e.g. to jump into an adjacent detail list. */
  onArrowRight?: () => void;
  /** Runs the caller's data subscription; returns its teardown. */
  subscribe: (controller: ManualDomListController) => () => void;
  /** Effect dependencies (e.g. the current filter). */
  dependencies: unknown[];
};

/**
 * Owns everything mechanical about the manual-DOM, append-only lists: the refs,
 * per-row React roots, drop/reset, the records + empty-legend labels, and the
 * click / arrow-key navigation (including Arrow Left back to the states list).
 * The differing part - what data drives the list and how a row maps to the
 * selection store - stays with the caller via `subscribe`, `getSelectedId`, and
 * `selectById`.
 */
export const useManualDomList = (config: ManualDomListConfig) => {
  const mainListRef = useRef<HTMLUListElement | null>(null);
  const recordsCountRef = useRef<HTMLParagraphElement | null>(null);
  const emptyLegendRef = useRef<HTMLParagraphElement | null>(null);

  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const listEl = mainListRef.current!;
    const { rowClass } = configRef.current;
    const itemRoots = new ItemRoots();

    function selectRow(row: Element) {
      configRef.current.selectById(row.id);
      row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      (row as HTMLElement).focus();
    }

    function onListClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const row = target?.closest(`.${rowClass}`);
      if (!row?.id) return;

      selectRow(row);
    }

    function onListKeydown(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        focusGlobalStateList();
        return;
      }

      if (event.key === 'ArrowRight') {
        if (!configRef.current.onArrowRight) return;
        event.preventDefault();
        configRef.current.onArrowRight();
        return;
      }

      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

      const rows = Array.from(listEl.querySelectorAll(`.${rowClass}`));
      if (!rows.length) return;

      event.preventDefault();

      const selectedId = configRef.current.getSelectedId();
      const foundIndex = rows.findIndex((row) => row.id === selectedId);
      const selectedIndex = foundIndex === -1 ? 0 : foundIndex;

      const keyDirection = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = getNexIndex({ navigationItems: rows, selectedIndex, keyDirection });

      selectRow(rows[nextIndex]);
    }

    listEl.addEventListener('click', onListClick);
    listEl.addEventListener('keydown', onListKeydown);

    const controller: ManualDomListController = {
      listEl,
      appendItem: (node, parent = listEl) => itemRoots.mount(parent, node),
      dropAll: () => {
        itemRoots.unmountAll();
        listEl.innerHTML = '';
      },
      updateCounts: ({ total, rendered, hasFilter }) => {
        const countEl = recordsCountRef.current;
        if (countEl) {
          const isFiltered = total !== rendered;
          countEl.textContent = `Records: ${isFiltered ? `${rendered} of ${total}` : rendered}`;
        }

        const legendEl = emptyLegendRef.current;
        if (legendEl) {
          legendEl.style.display = hasFilter && rendered === 0 ? 'flex' : 'none';
        }
      },
    };

    const unsubscribe = configRef.current.subscribe(controller);

    return () => {
      listEl.removeEventListener('click', onListClick);
      listEl.removeEventListener('keydown', onListKeydown);
      unsubscribe();
      itemRoots.unmountAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, config.dependencies);

  return { mainListRef, recordsCountRef, emptyLegendRef };
};
