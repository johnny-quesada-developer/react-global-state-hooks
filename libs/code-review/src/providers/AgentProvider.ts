import path from 'node:path';
import { runCommand } from '../shared/exec';
import type { Logger } from '../shared/logger';
import type { RunArtifacts } from '../shared/runArtifacts';
import type {
  AgentEvent,
  AgentLimits,
  AgentSession,
  ModelTiers,
  PermissionGrant,
  ProviderDefinition,
  ProviderId,
} from './ProviderDefinition';

export interface AgentUsage {
  turns?: number;
  costUsd?: number;
  durationMs: number;
}

export interface EditOutcome {
  exitCode: number;
  summary: string;
  deniedActions: string[];
  usage: AgentUsage;
}

export interface AnalyzeParams {
  task: string;
  prompt: string;
  systemPrompt?: string;
  jsonSchema: object;
  cwd: string;
}

export interface EditParams {
  task: string;
  prompt: string;
  systemPrompt?: string;
  cwd: string;
  logger: Logger;
  session?: AgentSession;
}

export interface AgentProvider {
  id: ProviderId;
  label: string;
  models: ModelTiers;
  grant: PermissionGrant;
  supportsSessions: boolean;
  analyze: (params: AnalyzeParams) => Promise<string>;
  edit: (params: EditParams) => Promise<EditOutcome>;
}

const FIVE_MINUTES = 5 * 60 * 1000;

const tail = (text: string, characters = 1200) => text.slice(-characters).trim();

export const formatUsage = ({ turns, costUsd, durationMs }: AgentUsage) =>
  [
    turns === undefined ? undefined : `${turns} turn(s)`,
    costUsd === undefined ? undefined : `$${costUsd.toFixed(3)}`,
    `${(durationMs / 1000).toFixed(0)}s`,
  ]
    .filter(Boolean)
    .join(' · ');

export function createCliProvider({
  definition,
  binary,
  models,
  grant,
  limits,
  run,
  workspaceRoot,
  showAgentActivity,
}: {
  definition: ProviderDefinition;
  binary: string;
  models: ModelTiers;
  grant: PermissionGrant;
  limits: AgentLimits;
  run: RunArtifacts;
  workspaceRoot: string;
  showAgentActivity: boolean;
}): AgentProvider {
  return {
    id: definition.id,
    label: definition.label,
    models,
    grant,
    supportsSessions: definition.supportsSessions,

    async analyze({ task, prompt, systemPrompt, jsonSchema, cwd }) {
      const startedAt = Date.now();
      const outputFile = path.join(run.newTemporaryDirectory(task), 'last-message.txt');
      const command = definition.analyzeCommand({
        model: models.fast,
        prompt,
        systemPrompt,
        jsonSchema,
        outputFile,
      });
      const result = await runCommand({
        command: binary,
        args: command.args,
        cwd: command.cwd ?? cwd,
        timeoutMs: FIVE_MINUTES,
      });

      if (result.exitCode !== 0) {
        run.writePrompt({ task, prompt, response: `${result.stdout}\n${result.stderr}` });
        const reason = result.timedOut ? 'timed out' : `exited with ${result.exitCode}`;
        throw new Error(`${definition.label} ${reason}: ${tail(result.stderr || result.stdout)}`);
      }

      const output = definition.readAnalyzeOutput({ stdout: result.stdout, outputFile: command.outputFile });
      run.writePrompt({
        task,
        prompt: systemPrompt ? `[system]\n${systemPrompt}\n\n[user]\n${prompt}` : prompt,
        response: output.text,
      });
      run.recordUsage({
        kind: 'analyze',
        task,
        model: models.fast,
        costUsd: output.costUsd,
        durationMs: Date.now() - startedAt,
      });
      return output.text;
    },

    async edit({ task, prompt, systemPrompt, cwd, logger, session }) {
      const promptFile = run.writePrompt({
        task,
        prompt: systemPrompt ? `[system]\n${systemPrompt}\n\n[user]\n${prompt}` : prompt,
      });
      const sessionLabel = session
        ? session.hasStarted
          ? `resuming session ${session.id.slice(0, 8)}`
          : `new session ${session.id.slice(0, 8)}`
        : 'one-off session';
      logger.detail(
        `agent (${models.capable}) ${sessionLabel} · prompt: ${path.relative(workspaceRoot, promptFile)}`,
      );

      const startedAt = Date.now();
      let resultEvent: Extract<AgentEvent, { kind: 'result' }> | undefined;
      const command = definition.editCommand({
        model: models.capable,
        prompt,
        systemPrompt,
        grant,
        workspaceRoot,
        session,
        limits,
      });
      const result = await runCommand({
        command: binary,
        args: command.args,
        cwd: command.cwd ?? cwd,
        timeoutMs: limits.timeoutMs,
        output: 'stream',
        onLine: (line) => {
          definition.parseEditLine(line).forEach((event) => {
            if (event.kind === 'result') resultEvent = event;
            if (event.kind === 'tool' && showAgentActivity)
              logger.detail(`  ↳ ${event.name} ${event.target}`);
          });
        },
      });

      if (session && definition.supportsSessions && result.exitCode === 0) session.hasStarted = true;
      run.writeText(`prompts/${task}-response-${Date.now()}.md`, `${result.stdout}\n${result.stderr}`);
      const usage: AgentUsage = {
        turns: resultEvent?.turns,
        costUsd: resultEvent?.costUsd,
        durationMs: Date.now() - startedAt,
      };
      run.recordUsage({ kind: 'edit', task, model: models.capable, ...usage });
      logger.detail(`agent finished · ${formatUsage(usage)}${result.timedOut ? ' · TIMED OUT' : ''}`);

      return {
        exitCode: result.timedOut ? 124 : result.exitCode,
        summary: tail(resultEvent?.summary || result.stdout || result.stderr),
        deniedActions: resultEvent?.deniedActions ?? [],
        usage,
      };
    },
  };
}
