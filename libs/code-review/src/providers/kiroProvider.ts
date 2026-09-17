import os from 'node:os';
import path from 'node:path';
import { runCommand } from '../shared/exec';
import type { ProviderDefinition } from './ProviderDefinition';

const home = os.homedir();

const TRUSTED_TOOLS = 'fs_read,fs_write,execute_bash';

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
  supportsSessions: false,

  async checkAuthentication({ binary, workspaceRoot }) {
    const result = await runCommand({
      command: binary,
      args: ['whoami'],
      cwd: workspaceRoot,
      timeoutMs: 15_000,
    });
    return result.exitCode === 0 ? 'authenticated' : 'unknown';
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
