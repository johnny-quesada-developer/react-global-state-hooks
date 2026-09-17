import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runCommand } from '../shared/exec';
import type { EditApproval, ProviderDefinition } from './ProviderDefinition';

const home = os.homedir();

const AUTO_APPROVED_MODES = ['acceptEdits', 'auto', 'bypassPermissions', 'dontAsk'];

function listEditorExtensionBinaries(): string[] {
  return ['.vscode', '.cursor', '.windsurf']
    .map((editor) => path.join(home, editor, 'extensions'))
    .filter((extensionsDirectory) => fs.existsSync(extensionsDirectory))
    .flatMap((extensionsDirectory) =>
      fs
        .readdirSync(extensionsDirectory)
        .filter((name) => name.startsWith('anthropic.claude-code-'))
        .sort()
        .reverse()
        .map((name) => path.join(extensionsDirectory, name, 'resources', 'native-binary', 'claude')),
    );
}

function isWorkspaceTrusted(workspaceRoot: string): boolean {
  try {
    const globalConfig = JSON.parse(fs.readFileSync(path.join(home, '.claude.json'), 'utf8'));
    return globalConfig.projects?.[workspaceRoot]?.hasTrustDialogAccepted === true;
  } catch {
    return false;
  }
}

function readClaudeEditApproval({ workspaceRoot }: { workspaceRoot: string }): EditApproval {
  const userSettings = [path.join(home, '.claude', 'settings.json')];
  const projectSettings = [
    path.join(workspaceRoot, '.claude', 'settings.json'),
    path.join(workspaceRoot, '.claude', 'settings.local.json'),
  ];
  const appliedSettings = isWorkspaceTrusted(workspaceRoot)
    ? [...userSettings, ...projectSettings]
    : userSettings;
  const settingsFiles = appliedSettings.filter((file) => fs.existsSync(file));

  if (settingsFiles.length === 0) return 'asksForApproval';

  const allowsEdits = settingsFiles.some((file) => {
    try {
      const { permissions } = JSON.parse(fs.readFileSync(file, 'utf8'));
      const hasAutoApprovedMode = AUTO_APPROVED_MODES.includes(permissions?.defaultMode);
      const allowList: string[] = permissions?.allow ?? [];
      const hasEditAllowRule = allowList.some((rule) => /^(Edit|Write)(\(|$)/.test(rule));
      return hasAutoApprovedMode || hasEditAllowRule;
    } catch {
      return false;
    }
  });

  return allowsEdits ? 'autoApproved' : 'asksForApproval';
}

export const claudeProvider: ProviderDefinition = {
  id: 'claude',
  label: 'Claude Code',
  binaryNames: ['claude'],
  knownInstallLocations: () => [
    path.join(home, '.local', 'bin', 'claude'),
    path.join(home, '.claude', 'local', 'claude'),
    '/opt/homebrew/bin/claude',
    '/usr/local/bin/claude',
    ...listEditorExtensionBinaries(),
  ],
  installHint: 'curl -fsSL https://claude.ai/install.sh | bash   (or: npm i -g @anthropic-ai/claude-code)',
  loginHint: 'claude auth login',
  fastModel: 'haiku',

  async checkAuthentication({ binary, workspaceRoot }) {
    const result = await runCommand({
      command: binary,
      args: ['auth', 'status'],
      cwd: workspaceRoot,
      timeoutMs: 15_000,
    });
    if (result.exitCode !== 0) return 'unauthenticated';
    try {
      return JSON.parse(result.stdout).loggedIn ? 'authenticated' : 'unauthenticated';
    } catch {
      return 'unknown';
    }
  },

  readEditApproval: readClaudeEditApproval,

  analyzeCommand: ({ model, prompt, jsonSchema }) => ({
    args: [
      '-p',
      '--model',
      model,
      '--output-format',
      'json',
      '--tools',
      '',
      '--strict-mcp-config',
      '--disable-slash-commands',
      '--no-session-persistence',
      '--json-schema',
      JSON.stringify(jsonSchema),
      prompt,
    ],
  }),

  readAnalyzeOutput: ({ stdout }) => {
    const envelope = JSON.parse(stdout);
    if (envelope.is_error) throw new Error(`claude returned an error: ${envelope.result}`);
    return envelope.structured_output
      ? JSON.stringify(envelope.structured_output)
      : String(envelope.result ?? '');
  },

  headlessEditCommand: ({ model, prompt }) => ({
    args: ['-p', '--model', model, '--output-format', 'json', prompt],
  }),

  interactiveEditCommand: ({ model, prompt }) => ({ args: ['--model', model, prompt] }),

  parseHeadlessEditOutput: (stdout) => {
    try {
      const envelope = JSON.parse(stdout);
      const denials: { tool_name?: string; tool_input?: { file_path?: string } }[] =
        envelope.permission_denials ?? [];
      return {
        summary: String(envelope.result ?? ''),
        deniedActions: denials.map(({ tool_name, tool_input }) =>
          `${tool_name} ${tool_input?.file_path ?? ''}`.trim(),
        ),
      };
    } catch {
      return { summary: stdout, deniedActions: [] };
    }
  },
};
