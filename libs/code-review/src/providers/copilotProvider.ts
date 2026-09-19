import os from 'node:os';
import path from 'node:path';
import type { AgentEvent, PermissionGrant, ProviderDefinition } from './ProviderDefinition';

const home = os.homedir();

const withSystemPrompt = (prompt: string, systemPrompt: string | undefined) =>
  systemPrompt ? `${systemPrompt}\n\n---\n\n${prompt}` : prompt;

/**
 * Headless auth for `copilot` reads one of these three env vars, in this precedence order —
 * https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/authenticate-copilot-cli.
 * There's no documented non-interactive "am I logged in" command (interactive login is a `/login`
 * slash command inside the TUI), so this is the only headless signal that's actually sourced;
 * their absence means 'unknown', not 'unauthenticated' — the user may still be logged in via the
 * interactive OAuth flow, which this can't see.
 */
const HEADLESS_AUTH_ENV_VARS = ['COPILOT_GITHUB_TOKEN', 'GH_TOKEN', 'GITHUB_TOKEN'];

/**
 * `write` and `shell` scoping per https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/allowing-tools:
 * confirmed syntax is `--allow-tool='write(<specific file>)'` and `--allow-tool='shell(<pattern>)'`
 * / `--deny-tool='shell(<pattern>)'` (e.g. `shell(git:*)`). A directory-glob form for `write`
 * (`write(path/**)`, mirroring Claude's `Edit(path/**)`) is NOT confirmed anywhere in that doc, so —
 * like kiroProvider — this deliberately does not claim to scope writes to a folder.
 */
const toAllowDenyTools = ({ grant }: { grant: PermissionGrant }) => [
  '--allow-tool',
  'write',
  ...grant.bashPatterns.flatMap((pattern) => ['--allow-tool', `shell(${pattern})`]),
];

interface CopilotEvent {
  type?: string;
  event?: string;
  tool?: string;
  name?: string;
  path?: string;
  command?: string;
  message?: string;
  text?: string;
}

const describeTarget = (event: CopilotEvent) => (event.path ?? event.command ?? '').slice(0, 120);

export const copilotProvider: ProviderDefinition = {
  id: 'copilot',
  label: 'GitHub Copilot CLI',
  binaryNames: ['copilot'],
  knownInstallLocations: () => [
    path.join(home, '.local', 'bin', 'copilot'),
    '/opt/homebrew/bin/copilot',
    '/usr/local/bin/copilot',
  ],
  installHint: 'npm i -g @github/copilot   (or: gh extension install github/gh-copilot)',
  loginHint: 'run `copilot` and use the `/login` slash command, or set COPILOT_GITHUB_TOKEN/GH_TOKEN for headless use',
  // Copilot CLI defaults to claude-sonnet-4.5; gpt-5 is offered as an alternative
  // (https://github.blog/changelog/2025-10-03-github-copilot-cli-enhanced-model-selection-image-support-and-streamlined-ui/).
  models: { fast: 'claude-haiku-4.5', capable: 'claude-sonnet-4.5' },
  // `--name <id>` creates a new named session and `--resume <name>`/`-r <name>` continues it
  // (DeepWiki flag reference: https://deepwiki.com/github/copilot-cli/5.6-command-line-flags-reference) —
  // a genuine create/resume pair, unlike codex/kiro where only resuming an existing session is documented.
  supportsSessions: true,
  // No confirmed event shape for a denied/blocked tool call in `--output-format json` output.
  reportsPermissionDenials: false,

  async checkAuthentication() {
    return HEADLESS_AUTH_ENV_VARS.some((name) => Boolean(process.env[name])) ? 'authenticated' : 'unknown';
  },

  describeGrant: ({ grant, workspaceRoot }) => [
    `--allow-tool write (Copilot's --allow-tool has no confirmed directory-glob form, so writes aren't scoped to ${grant.scope === 'projects' ? path.relative(workspaceRoot, grant.editDirectories[0] ?? workspaceRoot) || '.' : 'the workspace'} specifically — the whole workspace is writable)`,
    `--allow-tool shell(<pattern>) for: ${grant.bashPatterns.join(', ')}`,
  ],

  analyzeCommand: ({ model, prompt, systemPrompt }) => ({
    args: [
      '--prompt',
      withSystemPrompt(prompt, systemPrompt),
      '--model',
      model,
      '--output-format',
      'json',
      '--deny-tool',
      'write,shell',
    ],
  }),

  readAnalyzeOutput: ({ stdout }) => ({ text: stdout }),

  editCommand: ({ model, prompt, systemPrompt, grant, session }) => {
    const sessionArgs = session ? (session.hasStarted ? ['--resume', session.id] : ['--name', session.id]) : [];
    return {
      args: [
        '--prompt',
        withSystemPrompt(prompt, systemPrompt),
        '--model',
        model,
        '--output-format',
        'json',
        ...toAllowDenyTools({ grant }),
        ...sessionArgs,
      ],
    };
  },

  parseEditLine: (line): AgentEvent[] => {
    if (!line.trim()) return [];
    let event: CopilotEvent;
    try {
      event = JSON.parse(line);
    } catch {
      return [{ kind: 'text', text: line }];
    }
    const kind = event.type ?? event.event;
    if (kind === 'tool' || kind === 'tool_call') {
      return [{ kind: 'tool', name: event.tool ?? event.name ?? 'tool', target: describeTarget(event) }];
    }
    if (kind === 'error') {
      return [{ kind: 'result', summary: event.message ?? line, deniedActions: [] }];
    }
    return [];
  },
};
