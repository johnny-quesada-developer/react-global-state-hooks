import React, { useEffect, useMemo } from 'react';
import { cn } from '@src/shared/tools/cn';
import { useLogsDiff, selectedActionHeader$ } from '../../_hooks';
import logsArray$, { extendedLogsById$ } from '@src/pages/main_tab/hooks/logsArray';
import { ShowChangesSummary } from '../ShowChangesSummary';
import { StateLog } from '@src/pages/main_tab/hooks/globalStates/helpers/useGlobalStates.types';
import { LogListItem } from '../../LogListItem';
import { useListNavigation } from '@src/shared/facelessComponents/useListNavigation';
import { Resizable } from '@src/shared/components';
import selectedGlobalStateId$ from '@src/pages/main_tab/hooks/selectedGlobalStateId';
import { useActionJson } from '@src/pages/main_tab/hooks/globalStates';
import { JsonCodeViewer } from '@src/shared/components';
import selectedLogs$ from '../../_hooks/selectedLogs/selectedLogs';

export type ActionStepsDetailsProps = React.HTMLAttributes<HTMLParagraphElement> & {};

export const ActionStepsDetails: React.FC<ActionStepsDetailsProps> = ({
  className = '',
  ...props
}: ActionStepsDetailsProps) => {
  const [actionId] = selectedActionHeader$();
  const [stateId] = selectedGlobalStateId$();
  const action = useActionJson({ stateId, actionId });

  const [[previousLog, currentLog], setSelectedLogs] = selectedLogs$();

  const logs = useMemo((): StateLog[] => {
    if (!action) return [];

    const extendedLogs = extendedLogsById$.getState();

    return action.logs.map((log) => extendedLogs[log.logId]);
  }, [action]);

  const listRef = React.useRef<HTMLUListElement | null>(null);

  const navigation = useListNavigation(
    {
      items: logs,
      containerRef: listRef,
      onSelect: (item) => {
        if (!item) return;

        const logsArray = logsArray$.getState();
        const previousItem = logsArray[item.value.index - 1] ?? null;
        setSelectedLogs([previousItem, item.value]);
      },
    },
    [logs]
  );

  useEffect(() => {
    const firstElement = logs[0] ?? null;
    setSelectedLogs([null, firstElement]);
  }, [logs, setSelectedLogs]);

  const isInitialGroup = !previousLog;
  const { diffDisplay, isDifferent } = useLogsDiff(previousLog, currentLog!);

  return (
    <Resizable initialLeft="25%" className={cn('StateDiffPerAction', className)} {...props}>
      <ul ref={listRef} className="flex-grow shrink-0 basis-0 flex flex-col overflow-y-scroll text-black h-fit">
        <li>
          <h1 className="px-4 py-2 bg-white border-b border-gray-400 font-semibold text-gray-500 sticky top-0">
            Execution Steps
          </h1>
        </li>

        {navigation.navigationItems.map((navItem) => (
          <LogListItem key={navItem.key} navItem={navItem} className="border-b border-gray-400 first:border-none" />
        ))}
      </ul>

      <div className="border-l border-gray-400 dark:border-white h-fit">
        <div className="flex flex-col gap-4 px-4 py-3">
          <ShowChangesSummary
            diffDisplay={diffDisplay}
            isDifferent={isDifferent}
            isInitialLog={isInitialGroup}
            currentLog={currentLog}
            collapsed={true}
          />

          <hr className="border-gray-400 dark:border-white" />

          <h1 className="font-semibold text-sm">Payload</h1>
          <JsonCodeViewer src={{ value: currentLog?.payload }} collapsed={4} />
        </div>
      </div>
    </Resizable>
  );
};

export default ActionStepsDetails;
