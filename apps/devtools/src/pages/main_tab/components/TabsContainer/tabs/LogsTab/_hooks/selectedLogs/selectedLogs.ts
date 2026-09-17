import type { StateLog } from '@src/pages/main_tab/hooks/globalStates/helpers/useGlobalStates.types';
import logsArray$ from '@src/pages/main_tab/hooks/logsArray';
import { createGlobalState } from 'react-global-state-hooks/createGlobalState';

type State = [previousLog: StateLog | null, currentLog: StateLog | null];

const initialValue = [null, null] as State;

export const selectedLogs$ = createGlobalState(initialValue, {
  name: 'selectedLogs',
  callbacks: {
    onInit: ({ setState, getState }) => {
      const selectLast = (logs: StateLog[]) => {
        const previousLog = logs[logs.length - 2] ?? null;
        const lastLog = logs[logs.length - 1];
        setState([previousLog, lastLog]);
      };

      logsArray$.subscribe(
        (logs) => {
          if (!logs.length) return setState([null, null]);

          const [, currentLog] = getState();

          // Preserve the user's selection while new logs stream in: only follow
          // the latest log when there is no valid current selection (initial
          // load or the selected log no longer exists, e.g. after a state
          // switch). logsArray$ rebuilds objects each emission, so re-resolve
          // the selected pair by logId rather than keeping the stale object.
          const currentIndex = currentLog ? logs.findIndex((log) => log.logId === currentLog.logId) : -1;

          if (currentIndex === -1) return selectLast(logs);

          setState([logs[currentIndex - 1] ?? null, logs[currentIndex]]);
        },
        {
          skipFirst: true,
        },
      );
    },
  },
});

export default selectedLogs$;
