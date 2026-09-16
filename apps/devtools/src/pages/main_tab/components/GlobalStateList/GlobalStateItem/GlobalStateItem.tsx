import React from 'react';
import { cn } from '@src/shared/tools/cn';
import { useIsSelectedState } from '@src/pages/main_tab/hooks/selectedGlobalStateId';
import { theme$ } from '@src/pages/main_tab/hooks/theme';
import { NavItemProps } from '@src/shared/facelessComponents';
import { DATA_LIST_SELECTED } from '@src/pages/main_tab/util/listFocusBridge';
import useStateMeta from '@src/pages/main_tab/hooks/globalStates/hooks/useStateMeta';
import generateStackHash from '@src/pages/main_tab/util/generateStackHash';
import type { GlobalStateId } from '@src/shared/schema/GlobalStateJson';
import { Badge } from '@src/shared/components';
import { UnseenBadge } from './UnseenBadge';
import { stateMetaDevTools$ } from '@src/pages/main_tab/hooks/globalStates';
import { debounce } from '@src/shared/tools';
import useMountEffect from '@src/pages/main_tab/hooks/useMountEffect';

export type GlobalStateItemProps = React.HTMLAttributes<HTMLLIElement> & {
  globalStateId: GlobalStateId;
  navProps: NavItemProps;
};

const { markAsTainted } = stateMetaDevTools$.actions;
const markAsTaintedDebounced = debounce(markAsTainted, 10);

export const GlobalStateItem: React.FC<GlobalStateItemProps> = ({
  className = '',
  globalStateId,
  navProps,
  ...props
}: GlobalStateItemProps) => {
  const [storeName] = useStateMeta<string | undefined>(globalStateId, (state) => state?.name);
  const [isContext] = useStateMeta<boolean>(globalStateId, (state) => state?.isContext ?? false);
  const [localStorageKey] = useStateMeta<string | undefined>(
    globalStateId,
    (stateMeta) => stateMeta?.localStorage?.key,
  );
  const [isSelected] = useIsSelectedState(globalStateId);

  const [theme] = theme$();

  useMountEffect(() => {
    if (isSelected) {
      markAsTaintedDebounced(globalStateId);
    }
  });

  return (
    <li
      className={cn(
        'relative flex justify-start p-2 cursor-pointer',
        {
          'border-l-4 border-blue-500': isSelected,
          'text-gray-900': theme === 'light',
          'text-gray-100': theme !== 'light',
          'bg-blue-100': isSelected && theme === 'light',
          'bg-blue-700': isSelected && theme !== 'light',
          'hover:bg-blue-200': !isSelected && theme === 'light',
          'hover:bg-blue-600': !isSelected && theme !== 'light',
        },
        className,
      )}
      {...props}
      {...navProps}
      {...(isSelected ? { [DATA_LIST_SELECTED]: true } : {})}
    >
      {Boolean(localStorageKey) && (
        <span
          className={cn(
            'absolute top-0 right-0 p-0.5',
            'text-xxs',
            {
              'text-gray-700': theme === 'light',
              'text-gray-300 font-semibold': theme !== 'light',
              'border-l border-b border-gray-400 rounded-sm opacity-50': true,
            },
            'dark:text-white',
          )}
        >
          local-storage
        </span>
      )}
      <span className={cn('text-xxs', 'text-gray-500 dark:text-white')}>{navProps.tabIndex + 1}.</span>{' '}
      {storeName?.includes('gs:') ? (localStorageKey ?? generateStackHash(storeName)) : storeName}
      {isContext && (
        <Badge variant="context" className="ml-2">
          context
        </Badge>
      )}
      <UnseenBadge globalStateId={globalStateId} />
    </li>
  );
};

export default GlobalStateItem;
