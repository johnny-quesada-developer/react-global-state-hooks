import { z } from 'zod';

export enum ActionTypeJsonEnum {
  LIFE_CYCLE = 'LIFE_CYCLE',
  LIFE_CYCLE_PARAMETER = 'LIFE_CYCLE_PARAMETER',
  CUSTOM_ACTION = 'CUSTOM_ACTION',
  STATE_ACTION = 'STATE_ACTION',
}

export const actionTypeJsonSchema = z.enum(ActionTypeJsonEnum);

export type ActionTypeJson = z.infer<typeof actionTypeJsonSchema>;

export function isActionTypeJson(data: unknown): data is ActionTypeJson {
  return actionTypeJsonSchema.safeParse(data).success;
}

export function assertActionTypeJson(data: unknown): asserts data is ActionTypeJson {
  const result = actionTypeJsonSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Invalid ActionTypeJson: ${errors.join(', ')}`);
  }
}
