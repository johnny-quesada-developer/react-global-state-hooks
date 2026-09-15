import isNil from 'json-storage-formatter/isNil';
import type { GlobalStateId } from '@src/shared/schema/GlobalStateJson';
import { actionKeysByStateId$ } from '../globalStates';
import { buildActionPerActionKey } from '../helpers/buildActionPerActionKey';

export const useActionPerActionKey = ({ stateId }: { stateId: GlobalStateId | null }) => {
  return actionKeysByStateId$.use.select(
    () => {
      if (isNil(stateId)) return null;

      return buildActionPerActionKey(stateId);
    },
    {
      dependencies: [stateId],
      isEqualRoot: (current, next): boolean => {
        if (!stateId) return current === next;

        return current.get(stateId) === next.get(stateId);
      },
    }
  );
};
