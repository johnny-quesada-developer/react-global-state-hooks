import { z } from 'zod';

export const metadataJsonSchema = z.record(z.string(), z.unknown());

export type MetadataJson = z.infer<typeof metadataJsonSchema>;

export function isMetadataJsonSchema(data: unknown): data is MetadataJson {
  return metadataJsonSchema.safeParse(data).success;
}

export function assertMetadataJsonSchema(data: unknown): asserts data is MetadataJson {
  const result = metadataJsonSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Invalid MetadataJson: ${errors.join(', ')}`);
  }
}
