import { z } from 'zod';

const kebabCase = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export const CriterionSchema = z.object({
  id: z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*$/, 'criterion ids are camelCase identifiers'),
  title: z.string().min(1),
  description: z.string().min(1),
});

export const BlockingFlagSchema = z.object({
  flag: z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*$/, 'flags are camelCase identifiers'),
  description: z.string().min(1),
});

export const PromptRuleDefinitionSchema = z.object({
  id: z.string().regex(kebabCase, 'rule ids are kebab-case'),
  title: z.string().min(1),
  description: z.string().min(1),
  scope: z
    .object({
      include: z.array(z.string()).min(1).default(['**/*.{ts,tsx,js,jsx}']),
      exclude: z
        .array(z.string())
        .default(['**/*.{test,spec}.*', '**/__tests__/**', '**/*.d.ts', '**/*.config.*']),
    })
    .prefault({}),
  criteria: z.array(CriterionSchema).min(1),
  passThreshold: z.number().min(0).max(10).default(7),
  blockingFlags: z.array(BlockingFlagSchema).default([]),
  canFix: z.boolean().default(true),
  maxAttempts: z.number().int().min(0).max(10).default(2),
  fixInstructions: z.string().default(''),
});

export type PromptRuleDefinition = z.infer<typeof PromptRuleDefinitionSchema>;
export type PromptRuleInput = z.input<typeof PromptRuleDefinitionSchema>;

export function parsePromptRuleDefinition({
  raw,
  source,
}: {
  raw: unknown;
  source: string;
}): PromptRuleDefinition {
  const parsed = PromptRuleDefinitionSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ');
  throw new Error(`invalid rule definition in ${source} → ${issues}`);
}

export function buildReviewSchema(definition: PromptRuleDefinition) {
  const score = z.number().min(0).max(10);
  const scores = z.object(Object.fromEntries(definition.criteria.map(({ id }) => [id, score])));
  return z.object({
    scores,
    flags: z.array(z.string()),
    evidence: z.array(z.string()),
    suggestedFixes: z.array(z.string()),
  });
}

export type PromptRuleReview = z.infer<ReturnType<typeof buildReviewSchema>>;
