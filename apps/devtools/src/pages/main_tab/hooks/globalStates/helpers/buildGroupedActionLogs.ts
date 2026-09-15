import type { ActionId, ActionJson } from '@src/shared/schema/ActionJson';
import type { GlobalStateId } from '@src/shared/schema/GlobalStateJson';
import { EntityAdapter } from '@src/shared/tools/EntityAdapter';
import { actionsById$, actionIdsByStateId$ } from '../globalStates';

export const buildGroupedActionLogs = (stateId: GlobalStateId | null) => {
  const groupedByActionStateLogs = new EntityAdapter<ActionId, ActionJson>({});
  if (!stateId) return groupedByActionStateLogs;

  const actionIds = actionIdsByStateId$.getState().get(stateId);
  if (!actionIds) return groupedByActionStateLogs;

  const actionsById = actionsById$.getState();

  for (const actionId of actionIds) {
    const action = actionsById.get(actionId);
    if (!action) continue;

    groupedByActionStateLogs.add(actionId, action);
  }

  return groupedByActionStateLogs;
};
