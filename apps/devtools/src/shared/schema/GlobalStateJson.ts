import { z } from 'zod';
import { metadataJsonSchema } from './MetadataJson';
import { localStorageJsonSchema } from './LocalStorageJson';
import { actionsCallbackJsonSchema } from './ActionsCallbackJson';
import { callbacksJsonSchema } from './CallbacksJson';
import uniqueId from 'react-global-state-hooks/uniqueId';

export type GlobalStateId = ReturnType<typeof generateGlobalStateId>;

export const generateGlobalStateId = uniqueId.for('store-id:');

export const globalStateJsonSchema = z.object({
  globalStateId: z.string().transform((val) => val as GlobalStateId),
  name: z.string(),
  metadata: metadataJsonSchema,
  localStorage: localStorageJsonSchema.nullable(),
  actions: actionsCallbackJsonSchema.nullable(),
  callbacks: callbacksJsonSchema.nullable(),
  initialState: z.unknown(),
  globalStatePath: z.string(),
  isContext: z.boolean(),
  // True when created during a React render (fiber lifecycle). Non-fiber stores are the ones the
  // untrack-on-same-path / re-announce-on-interaction flow applies to.
  isFiber: z.boolean().optional(),
});

export type GlobalStateJson = z.infer<typeof globalStateJsonSchema>;

export function isGlobalStateJson(data: unknown): data is GlobalStateJson {
  return globalStateJsonSchema.safeParse(data).success;
}

export function assertGlobalStateJson(data: unknown): asserts data is GlobalStateJson {
  const result = globalStateJsonSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Invalid GlobalStateJson: ${errors.join(', ')}`);
  }
}
