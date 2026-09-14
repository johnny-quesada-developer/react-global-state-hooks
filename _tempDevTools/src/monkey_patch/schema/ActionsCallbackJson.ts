import { z } from 'zod';
import { actionCallbackJsonSchema } from './ActionCallbackJson';

export const actionsCallbackJsonSchema = z.record(z.string(), actionCallbackJsonSchema);

export type ActionsCallbackJson = z.infer<typeof actionsCallbackJsonSchema>;

export function isActionsCallbackJsonSchema(data: unknown): data is ActionsCallbackJson {
  return actionsCallbackJsonSchema.safeParse(data).success;
}

export function assertActionsCallbackJsonSchema(data: unknown): asserts data is ActionsCallbackJson {
  const result = actionsCallbackJsonSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Invalid ActionsCallbackJson: ${errors.join(', ')}`);
  }
}
