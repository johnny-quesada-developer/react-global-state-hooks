import { z } from 'zod';
import { actionLogJsonSchema } from './ActionLogJson';
import { actionTypeJsonSchema } from './ActionTypeJson';
import { uniqueId } from 'react-global-state-hooks/uniqueId';

export type ActionId = ReturnType<typeof generateActionId>;

export const generateActionId = uniqueId.for('action:');

export const actionJsonSchema = z.object({
  actionId: z.string().transform((val) => val as ActionId),
  globalStateId: z.string(),
  action: z.string(),
  async: z.boolean(),
  start: z.number(),
  timing: z.number(),
  logs: z.array(actionLogJsonSchema),
  actionType: actionTypeJsonSchema,
});

export type ActionJson = z.infer<typeof actionJsonSchema>;

export const actionRefSchema = actionJsonSchema.pick({ actionId: true });

export const actionMutableMetaSchema = actionJsonSchema
  .pick({ globalStateId: true, async: true, timing: true })
  .partial();

export const actionUpdateSchema = actionRefSchema.and(actionMutableMetaSchema);

export type ActionUpdate = z.infer<typeof actionUpdateSchema>;

export function isActionJson(data: unknown): data is ActionJson {
  return actionJsonSchema.safeParse(data).success;
}

export function assertActionJson(data: unknown): asserts data is ActionJson {
  const result = actionJsonSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Invalid ActionJson: ${errors.join(', ')}`);
  }
}

export function assertActionUpdate(data: unknown): asserts data is ActionUpdate {
  const result = actionUpdateSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Invalid ActionUpdate: ${errors.join(', ')}`);
  }
}
