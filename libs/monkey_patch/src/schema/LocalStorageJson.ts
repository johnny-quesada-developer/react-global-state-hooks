import { z } from 'zod';

export const localStorageJsonSchema = z.object({
  key: z.string(),
  encrypt: z.string().optional(),
  decrypt: z.string().optional(),
});

export type LocalStorageJson = z.infer<typeof localStorageJsonSchema>;

export function isLocalStorageJsonSchema(data: unknown): data is LocalStorageJson {
  return localStorageJsonSchema.safeParse(data).success;
}

export function assertLocalStorageJsonSchema(data: unknown): asserts data is LocalStorageJson {
  const result = localStorageJsonSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Invalid LocalStorageJson: ${errors.join(', ')}`);
  }
}
