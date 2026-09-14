import { z } from 'zod';
import { setStateConfigJsonSchema } from './SetStateConfigJson';
import { subActionJsonSchema } from './SubActionJson';
import { ActionId } from './ActionJson';
import uniqueId from 'react-global-state-hooks/uniqueId';
import type { GlobalStateId } from './GlobalStateJson';

export type ActionLogId = ReturnType<typeof generateActionLogId>;

export const generateActionLogId = uniqueId.for('action-log:');

export const actionLogJsonSchema = z.object({
  /**
   * Parent action identifier
   */
  actionId: z.string().transform((val) => val as ActionId),

  /**
   * Unique identifier for the log entry
   */
  logId: z.string().transform((val) => val as ActionLogId),

  /**
   * The case of the lifecycle of the action
   */
  case: z.enum(['pending', 'resolved', 'rejected']),

  /**
   * Indicates from where the log was generated
   */
  scope: z.string(),

  error: z.unknown().optional(),
  globalStateId: z.string().transform((val) => val as GlobalStateId),
  payload: z.unknown().optional(),
  setStateConfig: setStateConfigJsonSchema.optional(),

  /**
   * The sub-action performed within the main action
   */
  subAction: subActionJsonSchema.nullable(),

  timestamp: z.number(),
});

export type ActionLogJson = z.infer<typeof actionLogJsonSchema>;

export function isActionLogJson(data: unknown): data is ActionLogJson {
  return actionLogJsonSchema.safeParse(data).success;
}

export function assertActionLogJson(data: unknown): asserts data is ActionLogJson {
  const result = actionLogJsonSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Invalid ActionLogJson: ${errors.join(', ')}`);
  }
}
