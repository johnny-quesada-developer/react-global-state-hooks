import isDate from 'json-storage-formatter/isDate';
import isPrimitive from 'json-storage-formatter/isPrimitive';
import isRecord from 'react-global-state-hooks/isRecord';

export const mergeState = (state: unknown, newState: unknown): unknown => {
  if (isPrimitive(newState) || isDate(newState) || !isRecord(newState)) return newState;

  // if previous value was not an record there is nothing to merge
  if (!isRecord(state) || newState instanceof Map || newState instanceof Set || Array.isArray(newState)) {
    return newState;
  }

  const isNonSerializable = newState?.__non_serializable__;
  if (isNonSerializable) {
    throw `We cannot restore the state, the value was non serializable...`;
  }

  const keys = Object.keys(newState);
  const target = Object.create(null);

  for (const key of keys) {
    const isNonSerializable = (newState[key] as { __non_serializable__?: unknown })?.__non_serializable__;
    if (isNonSerializable) {
      // keep the old value
      target[key] = state[key];
      continue;
    }

    target[key] = mergeState(state[key], newState[key]);
  }

  return target;
};
