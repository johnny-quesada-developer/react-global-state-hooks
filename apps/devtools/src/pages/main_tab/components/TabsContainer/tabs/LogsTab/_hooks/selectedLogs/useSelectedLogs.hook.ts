import { selectedLogs$ } from './selectedLogs';

export const useIsSelectedLog = (logId: string) => {
  return selectedLogs$(
    ([, current]) => {
      return current?.logId === logId;
    },
    {
      dependencies: [logId],
    }
  );
};
