import React from 'react';
import { cn } from '@src/shared/tools/cn';

import { ActionsList } from './components/ActionsList';
import CodeEditor from './components/CodeEditor/CodeEditor';
import { useActionsKeys } from './context/actionsContext';
import { selectedTab$ } from '@src/pages/main_tab/hooks/selectedTab';
import { ActionsFilter } from './components/ActionsList/components/ActionsFilter';

export type ActionsTabProps = React.HTMLAttributes<HTMLDivElement> & {};

export const ActionsTab: React.FC<ActionsTabProps> = ({ className = '', ...props }: ActionsTabProps) => {
  const actionsKeys = useActionsKeys();

  return (
    <div className={cn('flex h-full', className)} {...props}>
      <div
        className={cn('w-fit flex flex-col', {
          'w-full': !actionsKeys.length,
        })}
      >
        {!actionsKeys.length && (
          <>
            <h3 className="text-gray-500 px-4 py-2">No custom actions found</h3>

            <p className="text-gray-500 px-4 py-2">
              The action default of the global state is <strong>setState</strong> in the{' '}
              <button className="text-blue-500" onClick={() => selectedTab$.setState('state')}>
                <strong>State tab</strong>
              </button>
            </p>

            <p className="text-gray-500 px-4 py-2">You can modify the value of the state on the state tab</p>
          </>
        )}

        {Boolean(actionsKeys.length) && (
          <>
            <ActionsFilter />
            <ActionsList />
          </>
        )}
      </div>

      {actionsKeys.length >= 1 && <CodeEditor />}
    </div>
  );
};

export default ActionsTab;
