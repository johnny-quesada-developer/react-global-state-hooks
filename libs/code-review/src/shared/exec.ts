import { spawn } from 'node:child_process';

export type OutputMode = 'capture' | 'inherit' | 'stream';

export interface RunCommandParams {
  command: string;
  args: string[];
  cwd: string;
  timeoutMs?: number;
  output?: OutputMode;
  onLine?: (line: string) => void;
  env?: NodeJS.ProcessEnv;
}

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  spawnError?: string;
}

const TEN_MINUTES = 10 * 60 * 1000;

export function runCommand({
  command,
  args,
  cwd,
  timeoutMs = TEN_MINUTES,
  output = 'capture',
  onLine,
  env = process.env,
}: RunCommandParams): Promise<CommandResult> {
  return new Promise((resolve) => {
    const isInteractive = output === 'inherit';
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: isInteractive ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const emitLines = (chunk: string) => {
      if (output !== 'stream' || !onLine) return;
      chunk
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .forEach(onLine);
    };

    child.stdout?.on('data', (data: Buffer) => {
      const chunk = data.toString();
      stdout += chunk;
      emitLines(chunk);
    });
    child.stderr?.on('data', (data: Buffer) => {
      const chunk = data.toString();
      stderr += chunk;
      emitLines(chunk);
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ exitCode: 127, stdout, stderr, timedOut, spawnError: error.message });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code ?? 1, stdout, stderr, timedOut });
    });
  });
}
