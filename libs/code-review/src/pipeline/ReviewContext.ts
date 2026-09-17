import type { PermissionScope } from '../providers/ProviderDefinition';
import type { Ask } from '../shared/ask';
import type { Logger } from '../shared/logger';
import type { ProjectConfig } from '../shared/projectConfig';
import type { RunArtifacts } from '../shared/runArtifacts';

export interface CliOptions {
  targets: string[];
  provider?: string;
  model?: string;
  fastModel?: string;
  permissions?: PermissionScope;
  verbose: boolean;
  configuration?: 'reuse' | 'stepByStep';
  reusedConfiguration?: boolean;
  concurrency?: number;
  acceptDefaults: boolean;
  rules?: string[];
  goal?: number;
  maxCoverageAttempts?: number;
  maxQualityAttempts?: number;
  testSuffix?: string;
}

export interface ReviewContext {
  workspaceRoot: string;
  invocationDirectory: string;
  options: CliOptions;
  projectConfig: ProjectConfig;
  ask: Ask;
  logger: Logger;
  run: RunArtifacts;
}
