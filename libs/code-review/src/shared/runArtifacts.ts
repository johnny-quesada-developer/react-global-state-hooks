import fs from 'node:fs';
import path from 'node:path';
import type { LogEvent } from './logger';

export interface RunArtifacts {
  directory: string;
  reviewDirectory: string;
  recordEvent: (event: LogEvent) => void;
  writeText: (name: string, content: string) => string;
  writePrompt: (params: { task: string; prompt: string; response?: string }) => string;
  newTemporaryDirectory: (label: string) => string;
}

export function createRunArtifacts({ workspaceRoot }: { workspaceRoot: string }): RunArtifacts {
  const reviewDirectory = path.join(workspaceRoot, '.review');
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const directory = path.join(reviewDirectory, 'runs', runId);
  fs.mkdirSync(directory, { recursive: true });

  const eventsFile = path.join(directory, 'events.jsonl');
  let promptCounter = 0;
  let temporaryCounter = 0;

  const writeText = (name: string, content: string) => {
    const file = path.join(directory, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    return file;
  };

  return {
    directory,
    reviewDirectory,
    recordEvent: (event) => fs.appendFileSync(eventsFile, `${JSON.stringify(event)}\n`),
    writeText,
    writePrompt: ({ task, prompt, response }) => {
      promptCounter += 1;
      const name = `prompts/${String(promptCounter).padStart(3, '0')}-${task}.md`;
      const responseSection = response === undefined ? '' : `\n\n---\n## Response\n\n${response}`;
      return writeText(name, `# ${task}\n\n${prompt}${responseSection}`);
    },
    newTemporaryDirectory: (label) => {
      temporaryCounter += 1;
      const temporary = path.join(directory, 'tmp', `${String(temporaryCounter).padStart(3, '0')}-${label}`);
      fs.mkdirSync(temporary, { recursive: true });
      return temporary;
    },
  };
}
