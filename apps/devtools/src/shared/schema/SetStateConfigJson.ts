import { z } from 'zod';

export const setStateConfigJsonSchema = z.object({
  forceUpdate: z.boolean().optional(),
  identifier: z.string().optional(),
});

export type SetStateConfigJson = z.infer<typeof setStateConfigJsonSchema>;

export function isSetStateConfigJson(data: unknown): data is SetStateConfigJson {
  return setStateConfigJsonSchema.safeParse(data).success;
}

export function assertSetStateConfigJson(data: unknown): asserts data is SetStateConfigJson {
  const result = setStateConfigJsonSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Invalid SetStateConfigJson: ${errors.join(', ')}`);
  }
}
