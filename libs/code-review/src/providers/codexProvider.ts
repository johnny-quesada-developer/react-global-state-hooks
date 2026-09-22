import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runCommand } from '../shared/exec';
import type { AgentEvent, PermissionGrant, ProviderDefinition } from './ProviderDefinition';

const home = os.homedir();

const sandboxDirectory = ({ grant, workspaceRoot }: { grant: PermissionGrant; workspaceRoot: string }) => {
  const hasSingleProject = grant.scope === 'projects' && grant.editDirectories.length === 1;
  return hasSingleProject ? grant.editDirectories[0] : workspaceRoot;
};

const withSystemPrompt = (prompt: string, systemPrompt: string | undefined) =>
  systemPrompt ? `${systemPrompt}\n\n---\n\n${prompt}` : prompt;

/**
 * `--output-schema` (https://learn.chatgpt.com/docs/non-interactive-mode) wants a path to a JSON
 * Schema file, unlike Claude's inline `--json-schema <json>` — write it next to the caller's
 * `outputFile` so it lives in the same per-call temporary directory and needs no extra cleanup.
 */
const writeOutputSchema = ({ jsonSchema, outputFile }: { jsonSchema: object; outputFile: string }) => {
  const schemaFile = path.join(path.dirname(outputFile), 'output-schema.json');
  fs.writeFileSync(schemaFile, JSON.stringify(jsonSchema));
  return schemaFile;
};

/**
 * `codex exec --json` event shape, per https://learn.chatgpt.com/docs/non-interactive-mode
 * (the docs.md page on github.com is stub-only and just links there). Each line is one event:
 * `thread.started` (thread_id), `turn.started`/`turn.completed`/`turn.failed` (`usage` tokens on
 * completed), `item.started`/`item.completed` (an `item` with `id`/`type`/`status` — types include
 * `agent_message`, `reasoning`, `command_execution`, `file_changes`, `mcp_tool_call`, `web_search`,
 * `plan_update`), and `error`. No event exposes a denied/blocked action or a dollar cost — only
 * token counts — so `reportsPermissionDenials` stays `false` and `costUsd` stays unset rather than
 * guessed from a hardcoded per-token price.
 */
interface CodexEvent {
  type?: string;
  item?: { id?: string; type?: string; status?: string; command?: string; path?: string; paths?: string[]; query?: string };
  usage?: { input_tokens?: number; cached_input_tokens?: number; output_tokens?: number; reasoning_output_tokens?: number };
  message?: string;
}

const describeItemTarget = (item: CodexEvent['item']) => {
  const target = item?.command ?? item?.path ?? item?.paths?.join(', ') ?? item?.query ?? '';
  return target.slice(0, 120);
};

const describeUsage = (usage: CodexEvent['usage']) =>
  usage ? `tokens in=${usage.input_tokens ?? '?'} out=${usage.output_tokens ?? '?'}` : '';

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
  // `codex exec resume [SESSION_ID]` exists (per learn.chatgpt.com/docs/non-interactive-mode) but
  // there's no matching flag to START a new run under a chosen id, only to resume one that already
  // ran — so, like kiro, sessions stay unsupported until that's confirmed against a real install.
  supportsSessions: false,
  reportsPermissionDenials: false,

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

  analyzeCommand: ({ model, prompt, systemPrompt, jsonSchema, outputFile }) => ({
    args: [
      'exec',
      '--model',
      model,
      '--sandbox',
      'read-only',
      '--skip-git-repo-check',
      '--output-schema',
      writeOutputSchema({ jsonSchema, outputFile }),
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
      '--json',
      withSystemPrompt(prompt, systemPrompt),
    ],
    cwd: sandboxDirectory({ grant, workspaceRoot }),
  }),

  parseEditLine: (line): AgentEvent[] => {
    if (!line.trim()) return [];
    let event: CodexEvent;
    try {
      event = JSON.parse(line);
    } catch {
      return [{ kind: 'text', text: line }];
    }

    if (event.type === 'item.started' || event.type === 'item.completed') {
      const { item } = event;
      if (!item?.type || item.type === 'agent_message' || item.type === 'reasoning') return [];
      return [{ kind: 'tool', name: item.type, target: describeItemTarget(item) }];
    }
    if (event.type === 'turn.completed') {
      return [{ kind: 'result', summary: describeUsage(event.usage), deniedActions: [] }];
    }
    if (event.type === 'turn.failed' || event.type === 'error') {
      return [{ kind: 'result', summary: event.message ?? `codex reported ${event.type}`, deniedActions: [] }];
    }
    return [];
  },
};
