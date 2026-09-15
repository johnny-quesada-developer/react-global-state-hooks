import { z } from 'zod';

export enum SubActionJsonEnum {
  setState = 'setState',
  getLocalStorageItem = 'getLocalStorageItem',
  persistInitialState = 'persistInitialState',
  migrateState = 'migrateState',
}

export const subActionJsonSchema = z.enum([
  SubActionJsonEnum.setState,
  SubActionJsonEnum.getLocalStorageItem,
  SubActionJsonEnum.persistInitialState,
]);

export type SubActionJson = z.infer<typeof subActionJsonSchema>;

export function isSubActionJson(data: unknown): data is SubActionJson {
  return subActionJsonSchema.safeParse(data).success;
}

export function assertSubActionJson(data: unknown): asserts data is SubActionJson {
  const result = subActionJsonSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Invalid SubActionJson: ${errors.join(', ')}`);
  }
}
