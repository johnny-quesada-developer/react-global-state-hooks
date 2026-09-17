export type ProviderId = 'claude' | 'codex' | 'kiro' | 'fake';
export type EditMode = 'headless' | 'interactive';
export type AuthStatus = 'authenticated' | 'unauthenticated' | 'unknown';
export type EditApproval = 'autoApproved' | 'asksForApproval' | 'unknown';

export interface CommandSpec {
  args: string[];
  outputFile?: string;
}

export interface ParsedEditOutput {
  summary: string;
  deniedActions: string[];
}

export interface ProviderDefinition {
  id: ProviderId;
  label: string;
  binaryNames: string[];
  knownInstallLocations: () => string[];
  installHint: string;
  loginHint: string;
  fastModel: string;
  checkAuthentication: (params: { binary: string; workspaceRoot: string }) => Promise<AuthStatus>;
  readEditApproval: (params: { workspaceRoot: string }) => EditApproval;
  analyzeCommand: (params: {
    model: string;
    prompt: string;
    jsonSchema: object;
    outputFile: string;
  }) => CommandSpec;
  readAnalyzeOutput: (params: { stdout: string; outputFile?: string }) => string;
  headlessEditCommand: (params: { model: string; prompt: string }) => CommandSpec;
  interactiveEditCommand: (params: { model: string; prompt: string }) => CommandSpec;
  parseHeadlessEditOutput: (stdout: string) => ParsedEditOutput;
}
