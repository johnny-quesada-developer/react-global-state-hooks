import React, { useMemo } from 'react';
import { cn } from '@src/shared/tools/cn';
import { useLogsDiff, selectedActionHeader$ } from '../../_hooks';
import logsArray$, { extendedLogsById$ } from '@src/pages/main_tab/hooks/logsArray';
import { ShowChangesSummary } from '../ShowChangesSummary';
import { CompareJsonValues } from '@src/shared/components';
import selectedGlobalStateId$ from '@src/pages/main_tab/hooks/selectedGlobalStateId';
import { useActionJson } from '@src/pages/main_tab/hooks/globalStates';
import useStableRef from '@src/pages/main_tab/hooks/useStableRef';

export type StateDiffPerActionProps = React.HTMLAttributes<HTMLParagraphElement> & {};

export const StateDiffPerAction: React.FC<StateDiffPerActionProps> = ({
  className = '',
  ...props
}: StateDiffPerActionProps) => {
  const [actionId] = selectedActionHeader$();
  const [stateId] = selectedGlobalStateId$();
  const action = useActionJson({ stateId, actionId });

  const { previousLog, currentLog } = useStableRef(() => {
    if (!action) return { previousLog: null, currentLog: null };

    const logsArray = logsArray$.getState();
    const extendedLogs = extendedLogsById$.getState();

    const firstLogId = action.logs[0].logId;
    const firstLog = extendedLogs[firstLogId];

    if (!firstLog) return { previousLog: null, currentLog: null };

    const previousLogId = logsArray[firstLog.index - 1]?.logId ?? null;
    const lastLogId = action.logs[action.logs.length - 1].logId;

    const previousLog = extendedLogs[previousLogId] ?? null;
    const currentLog = extendedLogs[lastLogId] ?? null;

    return { previousLog, currentLog };
  }, [action, actionId]).current;

  const isInitialLog = !previousLog;
  const { diffDisplay, isDifferent } = useLogsDiff(previousLog, currentLog!);

  const hasError = useMemo(() => action?.logs?.some((log) => log.case === 'rejected') ?? false, [action?.logs]);

  return (
    <div className={cn('StateDiffPerAction flex flex-col gap-6 p-4', className)} {...props}>
      {hasError && (
        <>
          <h2 className="font-semibold text-red-500">There was an error</h2>

          <p className="">Take a look at the granular logs to see what went wrong.</p>

          <hr className="border-gray-400 dark:border-white" />
        </>
      )}

      {isDifferent && (
        <>
          <CompareJsonValues
            titlePrevious="Previous State"
            titleCurrent={isInitialLog ? 'Initial State' : 'Resulting State'}
            previous={isInitialLog ? null : previousLog?.state}
            current={currentLog?.state}
          />

          <hr className="border-gray-400 dark:border-white" />
        </>
      )}

      <ShowChangesSummary
        diffDisplay={diffDisplay}
        isDifferent={isDifferent}
        isInitialLog={isInitialLog}
        currentLog={currentLog}
      />
    </div>
  );
};

// const useSelectedLogs = () => {};

export default StateDiffPerAction;
