import { StateLog } from '@src/pages/main_tab/hooks/globalStates/helpers/useGlobalStates.types';
import { useCallback, useMemo } from 'react';
import { type Change, diffJson } from 'diff';
import { theme$ } from '@src/pages/main_tab/hooks/theme';

export const useLogsDiff = (previousLog: StateLog | null, currentLog: StateLog) => {
  const previousString = useMemo(() => JSON.stringify(previousLog?.state, null, 4) ?? '', [previousLog]);
  const currentString = useMemo(() => JSON.stringify(currentLog?.state, null, 4) ?? '', [currentLog]);

  const [theme] = theme$();

  const formatDiff = useCallback(
    (diff: Change[]) => {
      return diff
        .map((part) => {
          // Preserve indentation by replacing spaces with &nbsp;
          const formattedValue = part.value.replace(/ /g, '&nbsp;').replace(/\n/g, '<br />');

          if (part.added) {
            return `<span style="background: ${theme === 'light' ? '#d4fcbc' : '#2e7d32'};">${formattedValue}</span>`;
          }
          if (part.removed) {
            return `<span style="background: ${
              theme === 'light' ? '#fbb6c2' : '#c62828'
            }; text-decoration: line-through;">${formattedValue}</span>`;
          }
          return `<span>${formattedValue}</span>`;
        })
        .join('');
    },
    [theme]
  );

  const diff = useMemo(() => diffJson(previousString, currentString), [previousString, currentString]);
  const isDifferent = useMemo(() => diff.some((part) => part.added || part.removed), [diff]);
  const diffDisplay = useMemo(() => formatDiff(diff), [diff, formatDiff]);

  return {
    isDifferent,
    diffDisplay,
  };
};

export default useLogsDiff;
