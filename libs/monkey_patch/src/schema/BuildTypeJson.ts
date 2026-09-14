import { z } from 'zod';

export enum BuildTypeJsonEnum {
  production = 'production',
  development = 'development',
  unminified = 'unminified',
  outdated = 'outdated',
}

export const buildTypeJsonSchema = z.enum([
  BuildTypeJsonEnum.production,
  BuildTypeJsonEnum.development,
  BuildTypeJsonEnum.unminified,
  BuildTypeJsonEnum.outdated,
]);

export type BuildTypeJson = z.infer<typeof buildTypeJsonSchema>;

export function isBuildTypeJson(data: unknown): data is BuildTypeJson {
  return buildTypeJsonSchema.safeParse(data).success;
}

export function assertBuildTypeJson(data: unknown): asserts data is BuildTypeJson {
  const result = buildTypeJsonSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Invalid BuildTypeJson: ${errors.join(', ')}`);
  }
}
