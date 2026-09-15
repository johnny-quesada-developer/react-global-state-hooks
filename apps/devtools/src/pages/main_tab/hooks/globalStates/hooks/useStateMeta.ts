import { EntityAdapter } from '@src/shared/tools/EntityAdapter';
import globalStates$ from '../globalStates';
import type { GlobalStateMetaExtended } from '../helpers/useGlobalStates.types';
import isNil from 'json-storage-formatter/isNil';
import type { GlobalStateId } from '@src/shared/schema/GlobalStateJson';

const useStateMeta = <T>(
  key: GlobalStateId | null,
  selector?: (state: GlobalStateMetaExtended | null) => T,
  args?:
    | unknown[]
    | {
        isEqualRoot?: (
          a: EntityAdapter<GlobalStateId, GlobalStateMetaExtended>,
          b: EntityAdapter<GlobalStateId, GlobalStateMetaExtended>
        ) => boolean;
        isEqual?: (a: T, b: T) => boolean;
        dependencies?: unknown[];
      }
) => {
  const isDependenciesArray = Array.isArray(args);
  const dependencies = isDependenciesArray ? args : (args?.dependencies ?? []);
  const isEqualRoot = isDependenciesArray ? undefined : args?.isEqualRoot;
  const isEqual = isDependenciesArray ? undefined : args?.isEqual;

  const [state, ...rest] = globalStates$.use(
    (state) => (selector ?? ((s) => s))(isNil(key) ? null : (state.get(key) ?? null)) as T,
    {
      dependencies: [key, ...dependencies],
      isEqualRoot:
        isEqualRoot ??
        ((a, b) => {
          if (isNil(a) || isNil(b) || isNil(key)) return a === b;
          return a.get(key) === b.get(key);
        }),
      isEqual: isEqual,
    }
  );

  return [state as T, ...rest] as const;
};

export default useStateMeta;
