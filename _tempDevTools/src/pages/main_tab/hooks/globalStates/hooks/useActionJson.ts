import type { ActionJson } from '@src/shared/schema/ActionJson';
import type { GlobalStateId } from '@src/shared/schema/GlobalStateJson';
import type { ActionId } from '@src/shared/schema/ActionJson';
import { actionsById$ } from '../globalStates';

export const useActionJson = ({
  stateId,
  actionId,
}: {
  stateId: GlobalStateId | null;
  actionId: ActionId | null;
}): ActionJson | null => {
  return actionsById$.use.select(
    (actionsById) => {
      if (!stateId || !actionId) return null;
      return actionsById.get(actionId) ?? null;
    },
    {
      dependencies: [stateId, actionId],
      isEqualRoot: (current, next) => {
        if (!stateId || !actionId) return current === next;
        return current.get(actionId) === next.get(actionId);
      },
    }
  );
};
