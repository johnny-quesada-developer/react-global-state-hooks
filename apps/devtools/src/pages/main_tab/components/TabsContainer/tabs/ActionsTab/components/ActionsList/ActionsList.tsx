import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { cn } from '@src/shared/tools/cn';
import { selectableRow } from '@src/shared/tools';
import { useListNavigation } from '@src/shared/facelessComponents/useListNavigation';
import { isNonNullable } from '@src/shared/asserts';
import { actions$, useActions, useActionsKeys, useSelectedActionKey } from '../../context/actionsContext';
import selectedGlobalStateId$ from '@src/pages/main_tab/hooks/selectedGlobalStateId';

export type ActionsListProps = React.HTMLAttributes<HTMLUListElement> & {};

export const ActionsList: React.FC<ActionsListProps> = ({ className = '', ...props }: ActionsListProps) => {
  const actionsListRef = useRef<HTMLUListElement>(null);

  const { setSelectedActionKey } = actions$.use.actions();

  const [selectedGlobalStateId] = selectedGlobalStateId$();
  const actions = useActions();
  const actionsKeys = useActionsKeys();
  const selectedActionKey = useSelectedActionKey();

  const { navigationItems } = useListNavigation(
    {
      items: actionsKeys,
      containerRef: actionsListRef,
      onSelect: (item) => {
        setSelectedActionKey(item.value);
      },
    },
    [actionsKeys, selectedGlobalStateId],
  );

  // clean the selected action key when the selected state changes
  useEffect(() => {
    // the actual selection still present
    if (isNonNullable(actions[selectedActionKey as string])) return;

    setSelectedActionKey(actionsKeys[0] ?? null);
  }, [actionsKeys, actions, selectedActionKey, setSelectedActionKey]);

  return (
    <ul ref={actionsListRef} className={cn('flex-1 flex flex-col dark:bg-eighties', className)} {...props}>
      {navigationItems.map((item) => (
        <li key={`${item.key}`} {...item.props}>
          <button className={clsx(selectableRow({ selected: selectedActionKey === item.value }), 'px-2')}>
            <span className={cn('text-gray-500 dark:text-white text-xxs absolute top-1 right-0.5')}>
              calls: {actions[item.value]?.callCount}
            </span>
            <span className={cn('text-xxs', 'text-gray-500 dark:text-white')}>
              {item.props.tabIndex + 1}.
            </span>{' '}
            {item.value}
          </button>
        </li>
      ))}
    </ul>
  );
};

export default ActionsList;
