import { z } from 'zod';

export const actionCallbackJsonSchema = z.object({
  length: z.number(),
});

export type ActionCallbackJson = z.infer<typeof actionCallbackJsonSchema>;

export function isActionCallbackJson(data: unknown): data is ActionCallbackJson {
  return actionCallbackJsonSchema.safeParse(data).success;
}

export function assertActionCallbackJson(data: unknown): asserts data is ActionCallbackJson {
  const result = actionCallbackJsonSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Invalid ActionCallbackJson: ${errors.join(', ')}`);
  }
}
