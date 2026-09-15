import isNil from 'json-storage-formatter/isNil';
import type { GlobalStateId } from '@src/shared/schema/GlobalStateJson';
import type { ActionId, ActionJson } from '@src/shared/schema/ActionJson';
import { actionIdsByStateId$ } from '../globalStates';
import { buildGroupedActionLogs } from '../helpers/buildGroupedActionLogs';
import { EntityAdapter } from '@src/shared/tools/EntityAdapter';

const areGroupedEqual = (
  current: EntityAdapter<ActionId, ActionJson> | null,
  next: EntityAdapter<ActionId, ActionJson> | null
): boolean => {
  if (current === next) return true;
  if (isNil(current) || isNil(next)) return false;
  if (current.length !== next.length) return false;

  for (let i = 0; i < current.ids.length; i++) {
    const id = current.ids[i];
    if (current.get(id) !== next.get(id)) return false;
  }

  return true;
};

export const useGroupedActionLogs = ({ stateId }: { stateId: GlobalStateId | null }) => {
  return actionIdsByStateId$.use.select(
    () => {
      if (isNil(stateId)) return null;

      return buildGroupedActionLogs(stateId);
    },
    {
      dependencies: [stateId],
      isEqual: areGroupedEqual,
    }
  );
};
