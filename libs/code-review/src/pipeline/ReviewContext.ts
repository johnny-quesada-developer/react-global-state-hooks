import type { PermissionScope } from '../providers/ProviderDefinition';
import type { Ask } from '../shared/ask';
import type { Settings } from '../shared/settings';
import type { Logger } from '../shared/logger';
import type { RunArtifacts } from '../shared/runArtifacts';

export interface CliOptions {
  targets: string[];
  configPath?: string;
  provider?: string;
  model?: string;
  fastModel?: string;
  permissions?: PermissionScope;
  verbose: boolean;
  concurrency?: number;
  acceptDefaults: boolean;
  configuration?: 'reuse' | 'stepByStep';
  reusedConfiguration?: boolean;
  rules?: string[];
  goal?: number;
  maxCoverageAttempts?: number;
  maxQualityAttempts?: number;
  testSuffix?: string;
}

export interface ReviewContext {
  /** The directory `review` was actually invoked from (or `INIT_CWD`) — used for relative targets. */
  invocationDirectory: string;
  /** The nearest git repository root above the connector, if any — used for git operations only. */
  repositoryRoot: string | undefined;
  /** Where `review.config.json` (the connector) lives. */
  connectorPath: string;
  /** `<configurationDirectory>` from the connector — where settings.ts and rules/ live. */
  configurationDirectory: string;
  rulesDirectory: string;
  /** The consumer-configured review scope (`settings.workspace.root`, resolved to an absolute path). Distinct from the connector directory and from the git repository root. */
  workspaceRoot: string;
  settings: Settings;
  options: CliOptions;
  ask: Ask;
  logger: Logger;
  run: RunArtifacts;
}
