import { z } from 'zod';
import { getMessageJsonSchema } from './MessageJson';

const clearGlobalStatesPayloadSchema = z.object({
  globalStatePath: z.string(),
});

const clearGlobalStatesMessageSchema = getMessageJsonSchema('CLEAR_GLOBAL_STATES', clearGlobalStatesPayloadSchema);

export type ClearGlobalStatesMessage = z.infer<typeof clearGlobalStatesMessageSchema>;
export type ClearGlobalStatesMessagePayload = z.infer<typeof clearGlobalStatesPayloadSchema>;

export function assertClearGlobalStatesMessage(data: unknown): asserts data is ClearGlobalStatesMessage {
  const result = clearGlobalStatesMessageSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Invalid ClearGlobalStatesMessage: ${errors.join(', ')}`);
  }
}
