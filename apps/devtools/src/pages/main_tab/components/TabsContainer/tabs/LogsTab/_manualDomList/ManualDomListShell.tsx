import React from 'react';
import { cn } from '@src/shared/tools/cn';
import { LogsFilter } from '../LogsFilter';

export type ManualDomListShellProps = React.HTMLAttributes<HTMLDivElement> & {
  containerClass: string;
  mainListRef: React.Ref<HTMLUListElement>;
  recordsCountRef: React.Ref<HTMLParagraphElement>;
  emptyLegendRef: React.Ref<HTMLParagraphElement>;
};

/**
 * The static chrome shared by the manual-DOM lists: the records counter, the
 * filter input, the empty-query legend, and the scrollable <ul> that the
 * controller renders rows into. Everything here is driven imperatively through
 * the refs, so this component never re-renders per row.
 */
export const ManualDomListShell: React.FC<ManualDomListShellProps> = ({
  className = '',
  containerClass,
  mainListRef,
  recordsCountRef,
  emptyLegendRef,
  ...props
}) => (
  <div className={cn(containerClass, 'flex flex-col', className)} {...props}>
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

export default ManualDomListShell;
