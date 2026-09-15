import { z } from 'zod';
import { getMessageJsonSchema } from './MessageJson';
import { actionJsonSchema } from '../ActionJson';

// UPDATE_ACTION can send partial ActionJson (only changed fields)
const updateActionPayloadSchema = actionJsonSchema.partial();

const updateActionMessageSchema = getMessageJsonSchema('UPDATE_ACTION', updateActionPayloadSchema);

export type UpdateActionMessage = z.infer<typeof updateActionMessageSchema>;

export function assertUpdateActionMessage(data: unknown): asserts data is UpdateActionMessage {
  const result = updateActionMessageSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Invalid UpdateActionMessage message: ${errors.join(', ')}`);
  }
}
