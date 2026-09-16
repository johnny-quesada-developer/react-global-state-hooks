import React, { useRef, useState } from 'react';
import { cn } from '@src/shared/tools/cn';
import { GlobalStateItem } from './GlobalStateItem';
import { GlobalStateListFilter } from './GlobalStateListFilter';
import { useListNavigation } from '@src/shared/facelessComponents/useListNavigation';
import selectedGlobalStateId$ from '../../hooks/selectedGlobalStateId';
import globalStates$, { stateMetaDevTools$ } from '../../hooks/globalStates';
import { shallowCompare } from 'react-global-state-hooks';
import { getOrderedGlobalStates } from '../../hooks/globalStates/helpers/getOrderedGlobalStates';

export type GlobalStateListProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * TODO: Optimize to select only the names and allow the GlobalStateItem to select the rest of the data.
 */
export const GlobalStateList: React.FC<GlobalStateListProps> = ({
  className = '',
  ...props
}: GlobalStateListProps) => {
  const [filter, setFilter] = useState('');

  const [globalStates] = globalStates$.use((state) => getOrderedGlobalStates(state), {
    isEqualRoot: (current, next) => shallowCompare(current.ids, next.ids),
  });

  const listRef = useRef<HTMLUListElement | null>(null);

  const navigation = useListNavigation(
    {
      items: globalStates,
      containerRef: listRef,
      filter: (item) => {
        if (!filter) return false;

        return !item.name.toLowerCase().includes(filter.toLowerCase());
      },
      onSelect: (item) => {
        selectedGlobalStateId$.setState(item.value.globalStateId);
        stateMetaDevTools$.actions.markAsTainted(item.value.globalStateId);
      },
    },
    [filter, globalStates],
  );

  return (
    <div className={cn('flex flex-col min-h-0', className)} {...props}>
      <GlobalStateListFilter
        className="sticky top-0 z-10"
        inputProps={{
          defaultValue: filter,
          placeholder: 'Search...',
          onChange: (event) => {
            setFilter(event.target.value);
          },
        }}
      />

      <ul ref={listRef} className="flex-1 min-h-0 flex flex-col overflow-y-scroll dark:bg-eighties">
        {Boolean(!navigation.navigationItems.length) && (
          <li className="border-b border-gray-400">
            <p className="flex-1 flex gap-4 p-2 transition-colors duration-300 text-gray-400">
              No states match the query...
            </p>
          </li>
        )}

        {navigation.navigationItems.map((navItem) => (
          <GlobalStateItem
            key={navItem.key}
            navProps={navItem.props}
            globalStateId={navItem.value.globalStateId}
            className="border-b border-gray-400 last-of-type:border-b-0"
          />
        ))}
      </ul>
    </div>
  );
};

export default GlobalStateList;
