import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runCommand } from '../shared/exec';
import type { ProviderDefinition } from './ProviderDefinition';

const home = os.homedir();

const readTomlValue = ({ toml, key }: { toml: string; key: string }) =>
  toml.match(new RegExp(`^\\s*${key}\\s*=\\s*"([^"]+)"`, 'm'))?.[1];

export const codexProvider: ProviderDefinition = {
  id: 'codex',
  label: 'OpenAI Codex CLI',
  binaryNames: ['codex'],
  knownInstallLocations: () => [
    path.join(home, '.local', 'bin', 'codex'),
    '/opt/homebrew/bin/codex',
    '/usr/local/bin/codex',
  ],
  installHint: 'npm i -g @openai/codex   (or: brew install codex)',
  loginHint: 'codex login',
  fastModel: 'gpt-5.1-codex-mini',

  async checkAuthentication({ binary, workspaceRoot }) {
    const result = await runCommand({
      command: binary,
      args: ['login', 'status'],
      cwd: workspaceRoot,
      timeoutMs: 15_000,
    });
    return result.exitCode === 0 ? 'authenticated' : 'unauthenticated';
  },

  readEditApproval: () => {
    const configFile = path.join(home, '.codex', 'config.toml');
    if (!fs.existsSync(configFile)) return 'asksForApproval';
    const toml = fs.readFileSync(configFile, 'utf8');
    const sandboxMode = readTomlValue({ toml, key: 'sandbox_mode' });
    const sandboxAllowsWrites = sandboxMode === 'workspace-write' || sandboxMode === 'danger-full-access';
    return sandboxAllowsWrites ? 'autoApproved' : 'asksForApproval';
  },

  analyzeCommand: ({ model, prompt, outputFile }) => ({
    args: [
      'exec',
      '--model',
      model,
      '--sandbox',
      'read-only',
      '--skip-git-repo-check',
      '--output-last-message',
      outputFile,
      prompt,
    ],
    outputFile,
  }),

  readAnalyzeOutput: ({ stdout, outputFile }) => {
    const hasOutputFile = outputFile !== undefined && fs.existsSync(outputFile);
    return hasOutputFile ? fs.readFileSync(outputFile, 'utf8') : stdout;
  },

  headlessEditCommand: ({ model, prompt }) => ({ args: ['exec', '--model', model, prompt] }),

  interactiveEditCommand: ({ model, prompt }) => ({ args: ['--model', model, prompt] }),

  parseHeadlessEditOutput: (stdout) => ({ summary: stdout.slice(-2000), deniedActions: [] }),
};
