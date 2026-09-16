import React, { useEffect, useRef } from 'react';
import { cn } from '@src/shared/tools/cn';
import { selectedLogs$, logsFilter$ } from '../_hooks';
import { useListNavigation } from '@src/shared/facelessComponents/useListNavigation';
import { focusGlobalStateList, logsListClass } from '@src/pages/main_tab/util/listFocusBridge';
import { LogsFilter } from '../LogsFilter';
import { RecordsCount } from '../RecordsCount';
import { LogListItem } from '../LogListItem';
import { filterLogCallback } from '../_utils';
import { logsArray$ } from '@src/pages/main_tab/hooks/logsArray';
import { theme$ } from '@src/pages/main_tab/hooks/theme';

export type LogsListProps = React.HTMLAttributes<HTMLDivElement>;

export const LogsList: React.FC<LogsListProps> = ({ className = '', ...props }: LogsListProps) => {
  const [logsFilter] = logsFilter$();
  const [logsHistory] = logsArray$();

  const containerRef = useRef<HTMLUListElement | null>(null);

  const navigation = useListNavigation(
    {
      items: logsHistory,
      containerRef,
      filter: (item) => filterLogCallback(logsFilter, item),
      onSelect: (item, index) => {
        if (!item) return;

        const previousItem = logsHistory[index - 1] ?? null;
        selectedLogs$.setState([previousItem, item.value]);
      },
    },
    [logsHistory, logsFilter],
  );

  const [theme] = theme$();

  useEffect(() => {
    const listEl = containerRef.current;
    if (!listEl) return;

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft') return;

      event.preventDefault();
      focusGlobalStateList();
    };

    listEl.addEventListener('keydown', onKeydown);
    return () => listEl.removeEventListener('keydown', onKeydown);
  }, []);

  return (
    <div className={cn(logsListClass, 'flex flex-col', className)} {...props}>
      <div className="sticky top-0 z-10 ">
        <RecordsCount
          className="border-b border-gray-400"
          count={navigation.navigationItems.length}
          total={logsHistory.length}
        />

        <LogsFilter className="border-b border-gray-400 w-full" />

        {!navigation.navigationItems.length && (
          <p
            className={cn('flex gap-4 p-2 transition-colors duration-300', {
              'text-gray-900': theme === 'light',
              'text-gray-100': theme !== 'light',
            })}
          >
            No logs match the query...
          </p>
        )}
      </div>

      <ul ref={containerRef} className="flex-grow min-h-0 flex flex-col overflow-y-scroll">
        {navigation.navigationItems.map((item) => (
          <React.Fragment key={item.key}>
            <LogListItem key={item.key} navItem={item} />
            <li
              className={cn('border-b border-gray-400 first:border-none', {
                'text-gray-900': theme === 'light',
                'text-gray-100': theme !== 'light',
              })}
            />
          </React.Fragment>
        ))}
      </ul>
    </div>
  );
};

export default LogsList;
