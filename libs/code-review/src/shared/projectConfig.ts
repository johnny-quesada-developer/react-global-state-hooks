import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

export const PROJECT_CONFIG_FILE = 'review.config.json';

const ModelTiersOverride = z.object({ fast: z.string().optional(), capable: z.string().optional() });

const ProjectConfigSchema = z.object({
  rulesDirectory: z.string().default('libs/code-review/rules'),
  providers: z.record(z.string(), z.object({ models: ModelTiersOverride.optional() })).default({}),
  permissions: z
    .object({
      bash: z
        .array(z.string())
        .default([
          'yarn test *',
          'yarn vitest *',
          'npx vitest *',
          'npm test *',
          'vitest *',
          'git diff *',
          'git status *',
          'git log *',
        ]),
    })
    .prefault({}),
  agent: z
    .object({
      maxBudgetUsdPerAttempt: z.number().positive().default(1),
      attemptTimeoutMinutes: z.number().positive().default(10),
      scoreBatchSize: z.number().int().min(1).max(10).default(4),
      concurrency: z.number().int().min(1).max(8).default(1),
    })
    .prefault({}),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

export const defaultProjectConfig = (): ProjectConfig => ProjectConfigSchema.parse({});

export function loadProjectConfig(workspaceRoot: string): {
  config: ProjectConfig;
  source: 'file' | 'defaults';
} {
  const file = path.join(workspaceRoot, PROJECT_CONFIG_FILE);
  if (!fs.existsSync(file)) return { config: defaultProjectConfig(), source: 'defaults' };

  const parsed = ProjectConfigSchema.safeParse(JSON.parse(fs.readFileSync(file, 'utf8')));
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`${PROJECT_CONFIG_FILE} is invalid → ${issues}`);
  }
  return { config: parsed.data, source: 'file' };
}

export const resolveRulesDirectory = ({
  workspaceRoot,
  config,
}: {
  workspaceRoot: string;
  config: ProjectConfig;
}) => path.resolve(workspaceRoot, config.rulesDirectory);
