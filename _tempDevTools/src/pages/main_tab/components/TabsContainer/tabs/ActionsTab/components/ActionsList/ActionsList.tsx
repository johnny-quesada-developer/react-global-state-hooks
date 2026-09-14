import React, { useEffect, useRef } from 'react';
import { cn } from '@src/shared/tools/cn';
import { useListNavigation } from '@src/shared/facelessComponents/useListNavigation';
import { isNonNullable } from '@src/shared/asserts';
import { actions$, useActions, useActionsKeys, useSelectedActionKey } from '../../context/actionsContext';
import selectedGlobalStateId$ from '@src/pages/main_tab/hooks/selectedGlobalStateId';
import { theme$ } from '@src/pages/main_tab/hooks/theme';

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
    [actionsKeys, selectedGlobalStateId]
  );

  // clean the selected action key when the selected state changes
  useEffect(() => {
    // the actual selection still present
    if (isNonNullable(actions[selectedActionKey as string])) return;

    setSelectedActionKey(actionsKeys[0] ?? null);
  }, [actionsKeys, actions, selectedActionKey, setSelectedActionKey]);

  const [theme] = theme$();

  return (
    <ul ref={actionsListRef} className={cn('flex-1 flex flex-col dark:bg-eighties', className)} {...props}>
      {navigationItems.map((item) => (
        <li key={`${item.key}`} {...item.props} className="relative border-b border-gray-400 last-of-type:border-b-0">
          <button
            className={cn(
              'w-full flex gap-2 px-2 py-2 transition-colors duration-300',
              'justify-start items-center select-text text-nowrap',
              {
                'bg-blue-100': selectedActionKey === item.value,
                'border-l-4 border-blue-500': selectedActionKey === item.value,
                'text-gray-900': Boolean(actions[item.value]),
                'text-gray-100': !actions[item.value],
                'bg-blue-700': selectedActionKey === item.value && !actions[item.value],
                'hover:bg-blue-200': selectedActionKey !== item.value && Boolean(actions[item.value]),
                'hover:bg-blue-600': selectedActionKey !== item.value && !actions[item.value],
                '!text-white': selectedActionKey !== item.value && theme === 'dark',
              }
            )}
          >
            <span
              className={cn('text-gray-500 text-xxs absolute top-1 right-0.5', {
                '!text-white': selectedActionKey !== item.value && theme === 'dark',
              })}
            >
              calls: {actions[item.value]?.callCount}
            </span>
            <span className={cn('text-xxs', 'text-gray-500 dark:text-white')}>{item.props.tabIndex + 1}.</span>{' '}
            {item.value}
          </button>
        </li>
      ))}
    </ul>
  );
};

export default ActionsList;
