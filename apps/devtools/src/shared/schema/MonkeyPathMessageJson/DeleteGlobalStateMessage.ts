import { z } from 'zod';
import { getMessageJsonSchema } from './MessageJson';

const deleteGlobalStatePayloadSchema = z.object({
  globalStateId: z.string(),
});

const deleteGlobalStateMessageSchema = getMessageJsonSchema('DELETE_GLOBAL_STATE', deleteGlobalStatePayloadSchema);

export type DeleteGlobalStateMessage = z.infer<typeof deleteGlobalStateMessageSchema>;

export function assertDeleteGlobalStateMessage(data: unknown): asserts data is DeleteGlobalStateMessage {
  const result = deleteGlobalStateMessageSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Invalid DeleteGlobalStateMessage message: ${errors.join(', ')}`);
  }
}
