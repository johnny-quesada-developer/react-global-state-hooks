import os from 'node:os';
import path from 'node:path';
import { runCommand } from '../shared/exec';
import type { ProviderDefinition } from './ProviderDefinition';

const home = os.homedir();

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
  fastModel: 'claude-haiku-4.5',

  async checkAuthentication({ binary, workspaceRoot }) {
    const result = await runCommand({
      command: binary,
      args: ['whoami'],
      cwd: workspaceRoot,
      timeoutMs: 15_000,
    });
    return result.exitCode === 0 ? 'authenticated' : 'unknown';
  },

  readEditApproval: () => 'unknown',

  analyzeCommand: ({ model, prompt }) => ({ args: ['chat', '--no-interactive', '--model', model, prompt] }),

  readAnalyzeOutput: ({ stdout }) => stdout,

  headlessEditCommand: ({ model, prompt }) => ({
    args: ['chat', '--no-interactive', '--model', model, prompt],
  }),

  interactiveEditCommand: ({ model, prompt }) => ({ args: ['chat', '--model', model, prompt] }),

  parseHeadlessEditOutput: (stdout) => ({ summary: stdout.slice(-2000), deniedActions: [] }),
};
