import { z } from 'zod';
import { getMessageJsonSchema } from './MessageJson';
import { actionLogJsonSchema } from '../ActionLogJson';

const addActionLogMessageSchema = getMessageJsonSchema('ADD_ACTION_LOG', actionLogJsonSchema);

export type AddActionLogMessage = z.infer<typeof addActionLogMessageSchema>;

export function assertAddActionLogMessage(data: unknown): asserts data is AddActionLogMessage {
  const result = addActionLogMessageSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Invalid AddActionLogMessage message: ${errors.join(', ')}`);
  }
}
