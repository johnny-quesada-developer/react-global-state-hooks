import { z } from 'zod';
import { globalStateJsonSchema } from '../GlobalStateJson';
import { getMessageJsonSchema } from './MessageJson';

const addGlobalStateMessageSchema = getMessageJsonSchema('ADD_GLOBAL_STATE', globalStateJsonSchema);

export type AddGlobalStateMessage = z.infer<typeof addGlobalStateMessageSchema>;

export function assertAddGlobalStateMessage(data: unknown): asserts data is AddGlobalStateMessage {
  const result = addGlobalStateMessageSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Invalid AddGlobalStateMessage message: ${errors.join(', ')}`);
  }
}
