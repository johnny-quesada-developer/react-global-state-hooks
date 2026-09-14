import React from 'react';
import styles from './ShowChangesSummary.module.scss';
import { JsonCodeViewer } from '@src/shared/components';
import { StateLog } from '@src/pages/main_tab/hooks/globalStates/helpers/useGlobalStates.types';

export type ShowChangesSummaryProps = {
  diffDisplay: string;
  isDifferent: boolean;
  isInitialLog: boolean;
  currentLog: StateLog | null;
  collapsed?: number | boolean;
};

export const ShowChangesSummary: React.FC<ShowChangesSummaryProps> = ({
  diffDisplay,
  isDifferent,
  isInitialLog,
  currentLog,
  collapsed = 4,
}: ShowChangesSummaryProps) => {
  if (!currentLog) return null;

  return (
    <>
      {currentLog.case === 'rejected' && (
        <>
          <h1 className="font-semibold text-sm text-red-500">There was an error</h1>

          <p className="">
            <span className="font-semibold text-red-500">Error:</span> {JSON.stringify(currentLog.error)}
          </p>
        </>
      )}

      {currentLog.case !== 'rejected' && (
        <>
          {isInitialLog && <h1 className="font-semibold text-sm">Initial State</h1>}
          {!isInitialLog && (
            <>
              {isDifferent && <h1 className="font-semibold text-sm">How did the state change?</h1>}

              {!isDifferent && currentLog.case === 'pending' && (
                <h1 className="font-semibold text-sm">No changes in state yet</h1>
              )}

              {!isDifferent && currentLog.case === 'resolved' && (
                <h1 className="font-semibold text-sm">State remains the same</h1>
              )}
            </>
          )}
          {isDifferent && <p className={styles.stateDiff} dangerouslySetInnerHTML={{ __html: diffDisplay }} />}
          {!isDifferent && <JsonCodeViewer src={{ value: currentLog.state }} collapsed={collapsed} />}
        </>
      )}
    </>
  );
};

export default ShowChangesSummary;
