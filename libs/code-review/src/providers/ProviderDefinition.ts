export type ProviderId = 'claude' | 'codex' | 'kiro' | 'fake';
export type AuthStatus = 'authenticated' | 'unauthenticated' | 'unknown';

export interface ModelTiers {
  fast: string;
  capable: string;
}

export type PermissionScope = 'workspace' | 'projects';

export interface PermissionGrant {
  scope: PermissionScope;
  editDirectories: string[];
  bashPatterns: string[];
}

export interface AgentSession {
  id: string;
  hasStarted: boolean;
}

export interface AgentLimits {
  maxBudgetUsd: number;
  timeoutMs: number;
}

export interface CommandSpec {
  args: string[];
  cwd?: string;
  outputFile?: string;
}

export interface AnalyzeOutput {
  text: string;
  costUsd?: number;
}

export type AgentEvent =
  | { kind: 'tool'; name: string; target: string }
  | { kind: 'text'; text: string }
  | { kind: 'result'; summary: string; deniedActions: string[]; turns?: number; costUsd?: number };

export interface ProviderDefinition {
  id: ProviderId;
  label: string;
  binaryNames: string[];
  knownInstallLocations: () => string[];
  installHint: string;
  loginHint: string;
  models: ModelTiers;
  supportsSessions: boolean;
  checkAuthentication: (params: { binary: string; workspaceRoot: string }) => Promise<AuthStatus>;
  describeGrant: (params: { grant: PermissionGrant; workspaceRoot: string }) => string[];
  analyzeCommand: (params: {
    model: string;
    prompt: string;
    systemPrompt?: string;
    jsonSchema: object;
    outputFile: string;
  }) => CommandSpec;
  readAnalyzeOutput: (params: { stdout: string; outputFile?: string }) => AnalyzeOutput;
  editCommand: (params: {
    model: string;
    prompt: string;
    systemPrompt?: string;
    grant: PermissionGrant;
    workspaceRoot: string;
    session?: AgentSession;
    limits: AgentLimits;
  }) => CommandSpec;
  parseEditLine: (line: string) => AgentEvent[];
}
