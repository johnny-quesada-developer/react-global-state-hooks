import React from 'react';
import { JsonCodeViewer } from '@src/shared/components';
import { cn } from '@src/shared/tools/cn';
import { selectedLogs$ } from '../../_hooks';
import { assertIsNonNullable } from '@src/shared/asserts/asserts';

export type PayloadDisplayProps = React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>;

export const PayloadDisplay: React.FC<PayloadDisplayProps> = ({ className = '' }: PayloadDisplayProps) => {
  const [currentLog] = selectedLogs$(([, currentLog]) => currentLog);

  assertIsNonNullable(currentLog, 'current log is required');

  return (
    <JsonCodeViewer
      collapsed={3}
      src={{
        ...(Object.keys(currentLog?.setStateConfig ?? {}).length
          ? {
              setStateConfig: currentLog.setStateConfig,
            }
          : {}),

        ...(currentLog?.error
          ? {
              error: currentLog.error,
            }
          : {}),

        payload: currentLog?.payload,
      }}
      className={cn('flex-1 p-4', className)}
    />
  );
};

export default PayloadDisplay;
