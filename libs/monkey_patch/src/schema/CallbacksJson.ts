import { z } from 'zod';

export enum CallbacksJsonEnum {
  onInit = 'onInit',
  onStateChanged = 'onStateChanged',
  onSubscribed = 'onSubscribed',
  computePreventStateChange = 'computePreventStateChange',
}

// Schema accepts any string array since globalState.callbacks can have custom callback names
export const callbacksJsonSchema = z.array(z.string());

export type CallbacksJson = z.infer<typeof callbacksJsonSchema>;

export function isCallbacksJsonSchema(data: unknown): data is CallbacksJson {
  return callbacksJsonSchema.safeParse(data).success;
}

export function assertCallbacksJsonSchema(data: unknown): asserts data is CallbacksJson {
  const result = callbacksJsonSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Invalid CallbacksJson: ${errors.join(', ')}`);
  }
}
