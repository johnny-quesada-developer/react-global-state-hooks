import { z } from 'zod';

export enum MonkeyPatchActionEnum {
  SET_REACT_BUILD_TYPE = 'SET_REACT_BUILD_TYPE',
  CLEAR_GLOBAL_STATES = 'CLEAR_GLOBAL_STATES',
  ADD_GLOBAL_STATE = 'ADD_GLOBAL_STATE',
  START_ACTION = 'START_ACTION',
  UPDATE_ACTION = 'UPDATE_ACTION',
  ADD_ACTION_LOG = 'ADD_ACTION_LOG',
  DELETE_GLOBAL_STATE = 'DELETE_GLOBAL_STATE',
}

export const monkeyPatchActionJsonSchema = z.nativeEnum(MonkeyPatchActionEnum);

export type MonkeyPatchActionJson = z.infer<typeof monkeyPatchActionJsonSchema>;

export function isMonkeyPatchActionJson(data: unknown): data is MonkeyPatchActionJson {
  return monkeyPatchActionJsonSchema.safeParse(data).success;
}

export function assertMonkeyPatchActionJson(data: unknown): asserts data is MonkeyPatchActionJson {
  const result = monkeyPatchActionJsonSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Invalid MonkeyPatchActionJson: ${errors.join(', ')}`);
  }
}
