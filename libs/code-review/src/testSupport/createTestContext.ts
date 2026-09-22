import path from 'node:path';
import type { ReviewContext } from '../pipeline/ReviewContext';
import type { Ask } from '../shared/ask';
import { scriptedAsk } from '../shared/ask';
import { silentLogger } from '../shared/logger';
import { createRunArtifacts } from '../shared/runArtifacts';
import { SettingsSchema, type Settings } from '../shared/settings';

/** Test-only helper: not part of the public API, never imported by production code. */
export function createTestContext({
  workspaceRoot,
  repositoryRoot = workspaceRoot,
  answers = {},
  ask,
  settings = SettingsSchema.parse({}),
  options = {},
}: {
  workspaceRoot: string;
  repositoryRoot?: string | undefined;
  answers?: Record<string, unknown>;
  ask?: Ask;
  settings?: Settings;
  options?: Partial<ReviewContext['options']>;
}): ReviewContext {
  const configurationDirectory = path.join(workspaceRoot, 'qa');
  return {
    invocationDirectory: workspaceRoot,
    repositoryRoot,
    connectorPath: path.join(workspaceRoot, 'review.config.json'),
    configurationDirectory,
    rulesDirectory: path.join(configurationDirectory, 'rules'),
    providersDirectory: path.join(configurationDirectory, 'providers'),
    workspaceRoot,
    settings,
    options: { targets: [], acceptDefaults: true, verbose: false, allowDirty: true, failOnIssues: false, ...options },
    ask: ask ?? scriptedAsk(answers),
    logger: silentLogger(),
    run: createRunArtifacts({ workspaceRoot }),
  };
}
