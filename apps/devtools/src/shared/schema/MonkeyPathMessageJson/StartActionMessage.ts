import { z } from 'zod';
import { actionJsonSchema } from '../ActionJson';
import { getMessageJsonSchema } from './MessageJson';

const startActionMessageSchema = getMessageJsonSchema('START_ACTION', actionJsonSchema);

export type StartActionMessage = z.infer<typeof startActionMessageSchema>;

export function assertStartActionMessage(data: unknown): asserts data is StartActionMessage {
  const result = startActionMessageSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Invalid message: ${errors.join(', ')}`);
  }
}
