import { z } from 'zod';
import { globalStateJsonSchema } from '../GlobalStateJson';
import { getMessageJsonSchema } from './MessageJson';

/**
 * Re-announce a store DevTools had stopped tracking (a non-fiber store superseded at its path but
 * still alive). Same payload as ADD_GLOBAL_STATE, but a distinct action so the panel adds it back
 * WITHOUT wiping the other stores tracked at that path.
 */
const reAddGlobalStateMessageSchema = getMessageJsonSchema('RE_ADD_GLOBAL_STATE', globalStateJsonSchema);

export type ReAddGlobalStateMessage = z.infer<typeof reAddGlobalStateMessageSchema>;

export function assertReAddGlobalStateMessage(data: unknown): asserts data is ReAddGlobalStateMessage {
  const result = reAddGlobalStateMessageSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Invalid ReAddGlobalStateMessage message: ${errors.join(', ')}`);
  }
}
