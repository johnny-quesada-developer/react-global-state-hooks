import React from 'react';
import { cn } from '@src/shared/tools/cn';
import { useLogsDiff, selectedLogs$ } from '../../_hooks';
import { ShowChangesSummary } from '../ShowChangesSummary';
import { CompareJsonValues } from '@src/shared/components';

export type StateDiffProps = React.HTMLAttributes<HTMLParagraphElement> & {};

export const StateDiff: React.FC<StateDiffProps> = ({ className = '', ...props }: StateDiffProps) => {
  const [[previousLog, currentLog]] = selectedLogs$();

  const isInitialLog = !previousLog;
  const previousState = isInitialLog ? currentLog?.state : previousLog?.state;

  const { diffDisplay, isDifferent } = useLogsDiff(previousLog, currentLog!);

  const previous = !isInitialLog
    ? {
        value: previousState,
      }
    : null;

  return (
    <div className={cn('StateDiff flex flex-col gap-6 p-4', className)} {...props}>
      {isDifferent && (
        <>
          <CompareJsonValues
            titlePrevious="Previous State"
            titleCurrent="Resulting State"
            previous={previous}
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
