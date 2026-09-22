import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const LocalStateSchema = z.object({
  // Any provider id, not a fixed list — built-ins or a custom `providers/*.provider.ts`. A closed
  // enum here would make `loadLocalState` silently discard the ENTIRE saved state (not just this
  // field) the moment someone picked a provider outside it, since `rememberChoices` writes without
  // validating but `loadLocalState` re-validates on read.
  provider: z.string().optional(),
  models: z.object({ fast: z.string(), capable: z.string() }).optional(),
  permissions: z.enum(['workspace', 'projects']).optional(),
  concurrency: z.number().int().min(1).optional(),
  coverage: z
    .object({
      goal: z.number(),
      maxCoverageAttempts: z.number().int(),
      maxQualityAttempts: z.number().int(),
      testSuffix: z.enum(['test', 'spec']).optional(),
    })
    .optional(),
  savedAt: z.string().optional(),
});

export type LocalState = z.infer<typeof LocalStateSchema>;

const stateFile = (workspaceRoot: string) => path.join(workspaceRoot, '.review', 'config.json');

export function loadLocalState(workspaceRoot: string): LocalState | undefined {
  const file = stateFile(workspaceRoot);
  if (!fs.existsSync(file)) return undefined;
  try {
    const parsed = LocalStateSchema.safeParse(JSON.parse(fs.readFileSync(file, 'utf8')));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export function rememberChoices({
  workspaceRoot,
  patch,
}: {
  workspaceRoot: string;
  patch: Partial<LocalState>;
}): LocalState {
  const merged: LocalState = {
    ...(loadLocalState(workspaceRoot) ?? {}),
    ...patch,
    savedAt: new Date().toISOString(),
  };
  const file = stateFile(workspaceRoot);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(merged, null, 2)}\n`);
  return merged;
}

export const hasReusableConfiguration = (state: LocalState | undefined): state is LocalState =>
  state !== undefined && state.provider !== undefined;

export function describeLocalState(state: LocalState): string {
  const parts = [
    state.provider,
    state.models ? `${state.models.capable} for edits · ${state.models.fast} for scoring` : undefined,
    state.permissions ? `${state.permissions} edit permissions` : undefined,
    state.coverage
      ? `coverage goal ${state.coverage.goal}% · ${state.coverage.maxCoverageAttempts}/${state.coverage.maxQualityAttempts} attempts${state.coverage.testSuffix ? ` · .${state.coverage.testSuffix} files` : ''}`
      : undefined,
    state.concurrency ? `concurrency ${state.concurrency}` : undefined,
  ];
  return parts.filter(Boolean).join(' · ');
}
