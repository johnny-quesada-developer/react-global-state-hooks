import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runCommand } from '../shared/exec';
import type { PermissionGrant, ProviderDefinition } from './ProviderDefinition';

const home = os.homedir();

const sandboxDirectory = ({ grant, workspaceRoot }: { grant: PermissionGrant; workspaceRoot: string }) => {
  const hasSingleProject = grant.scope === 'projects' && grant.editDirectories.length === 1;
  return hasSingleProject ? grant.editDirectories[0] : workspaceRoot;
};

const withSystemPrompt = (prompt: string, systemPrompt: string | undefined) =>
  systemPrompt ? `${systemPrompt}\n\n---\n\n${prompt}` : prompt;

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
  models: { fast: 'gpt-5.1-codex-mini', capable: 'gpt-5.1-codex' },
  supportsSessions: false,

  async checkAuthentication({ binary, workspaceRoot }) {
    const result = await runCommand({
      command: binary,
      args: ['login', 'status'],
      cwd: workspaceRoot,
      timeoutMs: 15_000,
    });
    return result.exitCode === 0 ? 'authenticated' : 'unauthenticated';
  },

  describeGrant: ({ grant, workspaceRoot }) => [
    `--sandbox workspace-write (writes limited to ${path.relative(workspaceRoot, sandboxDirectory({ grant, workspaceRoot })) || '.'})`,
    'shell commands run inside the same sandbox',
  ],

  analyzeCommand: ({ model, prompt, systemPrompt, outputFile }) => ({
    args: [
      'exec',
      '--model',
      model,
      '--sandbox',
      'read-only',
      '--skip-git-repo-check',
      '--output-last-message',
      outputFile,
      withSystemPrompt(prompt, systemPrompt),
    ],
    outputFile,
  }),

  readAnalyzeOutput: ({ stdout, outputFile }) => {
    const hasOutputFile = outputFile !== undefined && fs.existsSync(outputFile);
    return { text: hasOutputFile ? fs.readFileSync(outputFile, 'utf8') : stdout };
  },

  editCommand: ({ model, prompt, systemPrompt, grant, workspaceRoot }) => ({
    args: [
      'exec',
      '--model',
      model,
      '--sandbox',
      'workspace-write',
      '--skip-git-repo-check',
      withSystemPrompt(prompt, systemPrompt),
    ],
    cwd: sandboxDirectory({ grant, workspaceRoot }),
  }),

  parseEditLine: (line) => (line.trim() ? [{ kind: 'text', text: line }] : []),
};
