import os from 'node:os';
import path from 'node:path';
import { runCommand } from '../shared/exec';
import type { ProviderDefinition } from './ProviderDefinition';

const home = os.homedir();

/**
 * Trust categories per https://kiro.dev/docs/cli/chat/security/ and the headless-mode guide
 * (https://kiro.dev/docs/cli/headless/): `read`, `write`, `shell`, `grep`, `glob`, `use_aws` —
 * NOT the `fs_read`/`fs_write`/`execute_bash` names this file used before (those never matched
 * a real category, so `--trust-tools` was silently granting nothing).
 */
const TRUSTED_TOOLS = 'read,write,shell';

const withSystemPrompt = (prompt: string, systemPrompt: string | undefined) =>
  systemPrompt ? `${systemPrompt}\n\n---\n\n${prompt}` : prompt;

export const kiroProvider: ProviderDefinition = {
  id: 'kiro',
  label: 'Kiro CLI',
  binaryNames: ['kiro-cli'],
  knownInstallLocations: () => [
    path.join(home, '.local', 'bin', 'kiro-cli'),
    '/opt/homebrew/bin/kiro-cli',
    '/usr/local/bin/kiro-cli',
  ],
  installHint: 'curl -fsSL https://cli.kiro.dev/install | bash',
  loginHint: 'kiro-cli login',
  models: { fast: 'claude-haiku-4.5', capable: 'claude-sonnet-4.5' },
  // kiro-cli documents `chat --resume-id <ID>` for resuming a specific past session, but not a
  // matching flag to CREATE a new session under a chosen id — without that we can't reliably
  // resume the exact session a later retry needs, so sessions stay unsupported until that's
  // confirmed against a real install.
  supportsSessions: false,
  // No documented event carries denied/blocked actions for `--output-format stream-json`
  // (https://kiro.dev/docs/cli/headless/); `parseEditLine` below doesn't parse structured events
  // yet either, so this is honestly `false` rather than assuming "no output means no denials".
  reportsPermissionDenials: false,

  async checkAuthentication({ binary, workspaceRoot }) {
    const result = await runCommand({
      command: binary,
      args: ['whoami'],
      cwd: workspaceRoot,
      timeoutMs: 15_000,
    });
    return result.exitCode === 0 ? 'authenticated' : 'unauthenticated';
  },

  describeGrant: () => [
    `--trust-tools=${TRUSTED_TOOLS} (Kiro cannot scope writes to a folder; the whole workspace is writable)`,
  ],

  analyzeCommand: ({ model, prompt, systemPrompt }) => ({
    args: ['chat', '--no-interactive', '--model', model, withSystemPrompt(prompt, systemPrompt)],
  }),

  readAnalyzeOutput: ({ stdout }) => ({ text: stdout }),

  editCommand: ({ model, prompt, systemPrompt }) => ({
    args: [
      'chat',
      '--no-interactive',
      `--trust-tools=${TRUSTED_TOOLS}`,
      '--model',
      model,
      withSystemPrompt(prompt, systemPrompt),
    ],
  }),

  parseEditLine: (line) => (line.trim() ? [{ kind: 'text', text: line }] : []),
};
