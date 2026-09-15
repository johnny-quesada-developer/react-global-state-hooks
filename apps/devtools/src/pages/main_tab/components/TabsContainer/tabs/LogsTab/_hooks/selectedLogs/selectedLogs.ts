import type { StateLog } from '@src/pages/main_tab/hooks/globalStates/helpers/useGlobalStates.types';
import logsArray$ from '@src/pages/main_tab/hooks/logsArray';
import isNil from 'json-storage-formatter/isNil';
import { createGlobalState } from 'react-global-state-hooks/createGlobalState';

type State = [previousLog: StateLog | null, currentLog: StateLog | null];

const initialValue = [null, null] as State;

export const selectedLogs$ = createGlobalState(initialValue, {
  name: 'selectedLogs',
  callbacks: {
    onInit: ({ setState }) => {
      logsArray$.subscribe(
        (logs) => {
          if (!logs.length) return setState([null, null]);

          const previousLog = logs[logs.length - 2] ?? null;
          const lastLog = logs[logs.length - 1];

          if (isNil(lastLog)) return setState([null, null]);

          setState([previousLog, lastLog]);
        },
        {
          skipFirst: true,
        }
      );
    },
  },
});

export default selectedLogs$;
