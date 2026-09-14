import { EntityAdapter } from '@src/shared/tools/EntityAdapter';
import { AdaptiveEntityAdapter } from '@src/shared/tools/AdaptiveEntityAdapter';
import type { GlobalStateMetaExtended } from './useGlobalStates.types';
import globalStates$, {
  actionsById$,
  actionIdsByStateId$,
  actionKeysByStateId$,
  syncActionToStores,
} from '../globalStates';

type RawMockState = {
  entities: Record<string, any>;
  ids: string[];
};

export function loadMockState(mockData: unknown) {
  const raw = mockData as RawMockState;
  const globalStatesAdapter = new EntityAdapter<any, GlobalStateMetaExtended>({});

  actionsById$.setState(new AdaptiveEntityAdapter({}));
  actionIdsByStateId$.setState(new EntityAdapter({}));
  actionKeysByStateId$.setState(new EntityAdapter({}));

  for (const stateId of raw.ids) {
    const { groupedByActionStateLogs, hooks: _hooks, ...stateFields } = raw.entities[stateId];

    const stateMeta: GlobalStateMetaExtended = {
      globalStatePath: '',
      ...stateFields,
    } as GlobalStateMetaExtended;

    globalStatesAdapter.add(stateId, stateMeta);

    if (groupedByActionStateLogs?.entities) {
      for (const actionId of groupedByActionStateLogs.ids ?? []) {
        syncActionToStores(groupedByActionStateLogs.entities[actionId]);
      }
    }
  }

  globalStates$.setState(globalStatesAdapter);
}

export function loadMockStateIfDevelopment(mockData: unknown) {
  if (process.env.NODE_ENV === 'development') {
    loadMockState(mockData);
  }
}

export function getStateSnapshot() {
  const globalStates = globalStates$.getState();
  const actionsById = actionsById$.getState();
  const actionIdsByStateId = actionIdsByStateId$.getState();
  const actionKeysByStateId = actionKeysByStateId$.getState();

  const result: Record<string, any> = {
    entities: {} as Record<string, any>,
    ids: globalStates.ids as string[],
  };

  for (const stateId of globalStates.ids) {
    const stateMeta = globalStates.entities[stateId as keyof typeof globalStates.entities];
    const stateActions: Record<string, any> = {};
    const stateActionIds: string[] = [];

    const actionIds = actionIdsByStateId.entities[stateId as keyof typeof actionIdsByStateId.entities];
    for (const actionId of actionIds ?? []) {
      const action = actionsById.entities[actionId as keyof typeof actionsById.entities];
      if (!action) continue;

      stateActions[actionId] = action;
      stateActionIds.push(actionId);
    }

    result.entities[stateId] = {
      ...stateMeta,
      groupedByActionStateLogs: {
        entities: stateActions,
        ids: stateActionIds,
      },
    };
  }

  const actionKeysEntities: Record<string, Record<string, string[]>> = {};
  for (const stateId of actionKeysByStateId.ids) {
    const keysByActionKey = actionKeysByStateId.entities[stateId as keyof typeof actionKeysByStateId.entities];
    if (!keysByActionKey) continue;
    actionKeysEntities[stateId as string] = Object.fromEntries(keysByActionKey);
  }

  result._actionKeysByStateId = {
    entities: actionKeysEntities,
    ids: actionKeysByStateId.ids,
  };

  return result;
}
