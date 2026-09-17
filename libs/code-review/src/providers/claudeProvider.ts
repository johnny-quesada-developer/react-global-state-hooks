import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runCommand } from '../shared/exec';
import type { AgentEvent, PermissionGrant, ProviderDefinition } from './ProviderDefinition';

const home = os.homedir();

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

export function toAllowedTools({
  grant,
  workspaceRoot,
}: {
  grant: PermissionGrant;
  workspaceRoot: string;
}): string[] {
  const editRules =
    grant.scope === 'workspace'
      ? ['Edit', 'Write']
      : grant.editDirectories.flatMap((directory) => {
          const relative = path.relative(workspaceRoot, directory).split(path.sep).join('/');
          return [`Edit(${relative}/**)`, `Write(${relative}/**)`];
        });
  const bashRules = grant.bashPatterns.map((pattern) => `Bash(${pattern})`);
  return [...editRules, ...bashRules];
}

interface StreamEvent {
  type?: string;
  message?: { content?: { type: string; name?: string; input?: Record<string, unknown>; text?: string }[] };
  result?: string;
  num_turns?: number;
  total_cost_usd?: number;
  permission_denials?: { tool_name?: string; tool_input?: { file_path?: string; command?: string } }[];
}

const describeToolTarget = (input: Record<string, unknown> | undefined) => {
  const target = input?.file_path ?? input?.command ?? input?.pattern ?? input?.path ?? '';
  return String(target).slice(0, 120);
};

const systemPromptArgs = (systemPrompt: string | undefined) =>
  systemPrompt ? ['--append-system-prompt', systemPrompt] : [];

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
  models: { fast: 'haiku', capable: 'sonnet' },
  supportsSessions: true,

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

  describeGrant: ({ grant, workspaceRoot }) => [
    `--allowedTools ${toAllowedTools({ grant, workspaceRoot }).join(',')}`,
  ],

  analyzeCommand: ({ model, prompt, systemPrompt, jsonSchema }) => ({
    args: [
      '-p',
      '--model',
      model,
      '--effort',
      'low',
      '--output-format',
      'json',
      '--tools',
      '',
      '--strict-mcp-config',
      '--disable-slash-commands',
      '--no-session-persistence',
      ...systemPromptArgs(systemPrompt),
      '--json-schema',
      JSON.stringify(jsonSchema),
      '--',
      prompt,
    ],
  }),

  readAnalyzeOutput: ({ stdout }) => {
    const envelope = JSON.parse(stdout);
    if (envelope.is_error) throw new Error(`claude returned an error: ${envelope.result}`);
    const text = envelope.structured_output
      ? JSON.stringify(envelope.structured_output)
      : String(envelope.result ?? '');
    return { text, costUsd: envelope.total_cost_usd };
  },

  editCommand: ({ model, prompt, systemPrompt, grant, workspaceRoot, session, limits }) => {
    const sessionArgs = !session
      ? ['--no-session-persistence']
      : session.hasStarted
        ? ['--resume', session.id]
        : ['--session-id', session.id];
    return {
      args: [
        '-p',
        '--model',
        model,
        '--output-format',
        'stream-json',
        '--verbose',
        '--max-budget-usd',
        String(limits.maxBudgetUsd),
        ...sessionArgs,
        ...systemPromptArgs(systemPrompt),
        '--allowedTools',
        toAllowedTools({ grant, workspaceRoot }).join(','),
        '--',
        prompt,
      ],
    };
  },

  parseEditLine: (line): AgentEvent[] => {
    let event: StreamEvent;
    try {
      event = JSON.parse(line);
    } catch {
      return [];
    }
    if (event.type === 'assistant') {
      return (event.message?.content ?? [])
        .filter((block) => block.type === 'tool_use')
        .map((block) => ({
          kind: 'tool',
          name: block.name ?? 'tool',
          target: describeToolTarget(block.input),
        }));
    }
    if (event.type === 'result') {
      const denials = event.permission_denials ?? [];
      return [
        {
          kind: 'result',
          summary: String(event.result ?? ''),
          deniedActions: denials.map(({ tool_name, tool_input }) =>
            `${tool_name} ${tool_input?.file_path ?? tool_input?.command ?? ''}`.trim(),
          ),
          turns: event.num_turns,
          costUsd: event.total_cost_usd,
        },
      ];
    }
    return [];
  },
};
