import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { loadConsumerModule } from './loadConsumerModule';

const ModelTiers = z.object({ fast: z.string().optional(), capable: z.string().optional() });

export const SettingsSchema = z.object({
  workspace: z.object({ root: z.string().default('.') }).prefault({}),
  projects: z.array(z.object({ name: z.string(), root: z.string() })).default([]),
  providers: z.record(z.string(), z.object({ models: ModelTiers.optional() })).default({}),
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

export type Settings = z.infer<typeof SettingsSchema>;
export type SettingsInput = z.input<typeof SettingsSchema>;

/** Identity helper so a consumer's settings.ts gets type-checking/autocomplete; no transformation. */
export const defineSettings = (settings: SettingsInput): SettingsInput => settings;

const SETTINGS_FILE_CANDIDATES = ['settings.ts', 'settings.js', 'settings.mjs'];

export function findSettingsFile(configurationDirectory: string): string | undefined {
  return SETTINGS_FILE_CANDIDATES.map((name) => path.join(configurationDirectory, name)).find((file) =>
    fs.existsSync(file),
  );
}

export async function loadSettings({ configurationDirectory }: { configurationDirectory: string }): Promise<Settings> {
  const settingsFile = findSettingsFile(configurationDirectory);
  const raw = settingsFile ? await loadConsumerModule<SettingsInput>(settingsFile) : {};
  const parsed = SettingsSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ');
    const source = settingsFile ?? '(no settings.ts found, using defaults)';
    throw new Error(`invalid settings from ${source} → ${issues}`);
  }
  return parsed.data;
}

export const resolveWorkspaceRoot = ({
  configurationDirectory,
  settings,
}: {
  configurationDirectory: string;
  settings: Settings;
}) => path.resolve(configurationDirectory, '..', settings.workspace.root);
