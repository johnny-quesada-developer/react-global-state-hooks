import { z } from 'zod';
import { getMessageJsonSchema } from './MessageJson';
import { actionUpdateSchema } from '../ActionJson';

const updateActionMessageSchema = getMessageJsonSchema('UPDATE_ACTION', actionUpdateSchema);

export type UpdateActionMessage = z.infer<typeof updateActionMessageSchema>;

export function assertUpdateActionMessage(data: unknown): asserts data is UpdateActionMessage {
  const result = updateActionMessageSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Invalid UpdateActionMessage message: ${errors.join(', ')}`);
  }
}
