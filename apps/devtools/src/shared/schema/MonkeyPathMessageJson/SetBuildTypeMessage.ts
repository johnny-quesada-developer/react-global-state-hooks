import { z } from 'zod';
import { buildTypeJsonSchema } from '../BuildTypeJson';
import { getMessageJsonSchema } from './MessageJson';

const setBuildTypePayloadSchema = z.object({
  buildType: buildTypeJsonSchema,
});

const setBuildTypeMessageSchema = getMessageJsonSchema('SET_REACT_BUILD_TYPE', setBuildTypePayloadSchema);

export type SetBuildTypeMessage = z.infer<typeof setBuildTypeMessageSchema>;

export function assertSetBuildTypeMessage(data: unknown): asserts data is SetBuildTypeMessage {
  const result = setBuildTypeMessageSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Invalid SET_REACT_BUILD_TYPE message: ${errors.join(', ')}`);
  }
}
