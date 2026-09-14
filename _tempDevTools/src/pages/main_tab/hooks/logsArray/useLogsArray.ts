import isNil from 'json-storage-formatter/isNil';
import globalStates$, { actionIdsByStateId$ } from '../globalStates/globalStates';
import type { StateLog } from '../globalStates/helpers/useGlobalStates.types';
import useSelectedGlobalStateId$ from '../selectedGlobalStateId';
import { createGlobalState } from 'react-global-state-hooks/createGlobalState';
import getLogArray from './getLogArray';
import { buildGroupedActionLogs } from '../globalStates/helpers/buildGroupedActionLogs';
import type { ActionId, ActionJson } from '@src/shared/schema/ActionJson';
import { EntityAdapter } from '@src/shared/tools/EntityAdapter';
import { shallowCompare } from 'react-global-state-hooks';
import { GlobalStateId } from '@src/shared/schema';

export const logsArray$ = createGlobalState([] as StateLog[], {
  name: 'logsArray',
  actions: {
    _: () => () => {
      throw new Error('This state should not be updated directly');
    },
  },
  callbacks: {
    onInit: ({ setState }) => {
      let previousGroupedByActionStateLogs: EntityAdapter<ActionId, ActionJson> | null = null;

      const computeAndSet = (stateId: GlobalStateId) => {
        const grouped = buildGroupedActionLogs(stateId);

        if (shallowCompare(previousGroupedByActionStateLogs, grouped)) {
          return;
        }

        previousGroupedByActionStateLogs = grouped;

        setState(
          getLogArray({
            actions: grouped.values(),
            selectedStateKey: stateId,
            globalStates: globalStates$.getState(),
          })
        );
      };

      // rebuild logs when selected state changes
      useSelectedGlobalStateId$.subscribe((stateId) => {
        if (isNil(stateId)) {
          previousGroupedByActionStateLogs = null;
          return setState([]);
        }

        computeAndSet(stateId);
      });

      // update logs when actions change
      actionIdsByStateId$.subscribe(
        () => {
          const stateId = useSelectedGlobalStateId$.getState();

          if (isNil(stateId)) {
            previousGroupedByActionStateLogs = null;
            return setState([]);
          }

          computeAndSet(stateId);
        },
        {
          skipFirst: true,
        }
      );
    },
  },
});

export const extendedLogsById$ = logsArray$.createObservable((logs) => {
  return logs.reduce(
    (acc, log) => {
      acc[log.logId] = log;
      return acc;
    },
    Object.create(null) as Record<string, StateLog>
  );
});

export default logsArray$;
