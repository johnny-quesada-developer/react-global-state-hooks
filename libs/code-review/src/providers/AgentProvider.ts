import path from 'node:path';
import { runCommand } from '../shared/exec';
import type { Logger } from '../shared/logger';
import type { RunArtifacts } from '../shared/runArtifacts';
import type { EditMode, ProviderDefinition, ProviderId } from './ProviderDefinition';

export interface EditOutcome {
  exitCode: number;
  summary: string;
  deniedActions: string[];
}

export interface AgentProvider {
  id: ProviderId;
  label: string;
  model: string;
  editMode: EditMode;
  analyze: (params: { task: string; prompt: string; jsonSchema: object; cwd: string }) => Promise<string>;
  edit: (params: { task: string; prompt: string; cwd: string; logger: Logger }) => Promise<EditOutcome>;
}

const FIVE_MINUTES = 5 * 60 * 1000;
const THIRTY_MINUTES = 30 * 60 * 1000;

const tail = (text: string, characters = 1200) => text.slice(-characters).trim();

export function createCliProvider({
  definition,
  binary,
  model,
  editMode,
  run,
}: {
  definition: ProviderDefinition;
  binary: string;
  model: string;
  editMode: EditMode;
  run: RunArtifacts;
}): AgentProvider {
  return {
    id: definition.id,
    label: definition.label,
    model,
    editMode,

    async analyze({ task, prompt, jsonSchema, cwd }) {
      const outputFile = path.join(run.newTemporaryDirectory(task), 'last-message.txt');
      const command = definition.analyzeCommand({ model, prompt, jsonSchema, outputFile });
      const result = await runCommand({ command: binary, args: command.args, cwd, timeoutMs: FIVE_MINUTES });

      if (result.exitCode !== 0) {
        run.writePrompt({ task, prompt, response: `${result.stdout}\n${result.stderr}` });
        const reason = result.timedOut ? 'timed out' : `exited with ${result.exitCode}`;
        throw new Error(`${definition.label} ${reason}: ${tail(result.stderr || result.stdout)}`);
      }

      const response = definition.readAnalyzeOutput({
        stdout: result.stdout,
        outputFile: command.outputFile,
      });
      run.writePrompt({ task, prompt, response });
      return response;
    },

    async edit({ task, prompt, cwd, logger }) {
      const promptFile = run.writePrompt({ task, prompt });
      const isInteractive = editMode === 'interactive';

      if (isInteractive) {
        logger.info(`opening an interactive ${definition.label} session — exit it when the agent is done`);
        const command = definition.interactiveEditCommand({ model, prompt });
        const result = await runCommand({
          command: binary,
          args: command.args,
          cwd,
          output: 'inherit',
          timeoutMs: THIRTY_MINUTES,
        });
        return { exitCode: result.exitCode, summary: 'interactive session finished', deniedActions: [] };
      }

      logger.detail(`agent working headless with ${model} (prompt: ${path.relative(cwd, promptFile)})`);
      const command = definition.headlessEditCommand({ model, prompt });
      const result = await runCommand({
        command: binary,
        args: command.args,
        cwd,
        timeoutMs: THIRTY_MINUTES,
      });
      const parsed = definition.parseHeadlessEditOutput(result.stdout);
      const ignoredSettingsWarning = result.stderr
        .split('\n')
        .find((line) => line.includes('has not been trusted'));
      if (ignoredSettingsWarning) logger.warn(ignoredSettingsWarning);
      run.writeText(`prompts/${task}-response-${Date.now()}.md`, `${result.stdout}\n${result.stderr}`);

      return {
        exitCode: result.exitCode,
        summary: tail(parsed.summary || result.stderr),
        deniedActions: parsed.deniedActions,
      };
    },
  };
}
