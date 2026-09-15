import { assertIsNonNullable } from '@src/shared/asserts';
import { StateLog } from '@src/pages/main_tab/hooks/globalStates/helpers/useGlobalStates.types';

export const filterLogCallback = (logsFilter: string, log: StateLog) => {
  // if filter is clean or is a header
  if (!logsFilter) return false;

  assertIsNonNullable(log, 'item should not be null');

  const { parentAction, subAction, case: actionCase } = log;

  const match = (value: string | undefined) => value?.toLowerCase().includes(logsFilter.toLowerCase());
  const columns = [parentAction, subAction ?? actionCase];

  return columns.some(match);
};
