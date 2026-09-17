import type { EditMode } from '../providers/ProviderDefinition';
import type { Ask } from '../shared/ask';
import type { Logger } from '../shared/logger';
import type { RunArtifacts } from '../shared/runArtifacts';

export interface CliOptions {
  target?: string;
  provider?: string;
  model?: string;
  editMode?: EditMode;
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
  ask: Ask;
  logger: Logger;
  run: RunArtifacts;
}
