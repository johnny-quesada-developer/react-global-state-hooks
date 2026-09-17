import { styleText } from 'node:util';

type Level = 'info' | 'step' | 'success' | 'warn' | 'error' | 'detail';

export interface LogEvent {
  at: string;
  level: Level;
  scope: string[];
  message: string;
  data?: unknown;
}

export type EventSink = (event: LogEvent) => void;

export interface Logger {
  child: (scope: string) => Logger;
  info: (message: string, data?: unknown) => void;
  step: (message: string, data?: unknown) => void;
  success: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
  detail: (message: string, data?: unknown) => void;
  addSink: (sink: EventSink) => void;
}

const levelBadge: Record<Level, string> = {
  info: styleText('cyan', '•'),
  step: styleText('magenta', '▸'),
  success: styleText('green', '✔'),
  warn: styleText('yellow', '⚠'),
  error: styleText('red', '✖'),
  detail: styleText('gray', '│'),
};

export function createLogger({
  scope = [],
  sinks = [],
  write = (line: string) => process.stdout.write(`${line}\n`),
}: {
  scope?: string[];
  sinks?: EventSink[];
  write?: (line: string) => void;
} = {}): Logger {
  const log = (level: Level) => (message: string, data?: unknown) => {
    const scopeLabel = scope.length ? styleText('gray', `[${scope.join(' › ')}] `) : '';
    const text = level === 'detail' ? styleText('gray', message) : message;
    write(`${levelBadge[level]} ${scopeLabel}${text}`);

    const event: LogEvent = { at: new Date().toISOString(), level, scope, message, data };
    sinks.forEach((sink) => sink(event));
  };

  return {
    child: (childScope) => createLogger({ scope: [...scope, childScope], sinks, write }),
    info: log('info'),
    step: log('step'),
    success: log('success'),
    warn: log('warn'),
    error: log('error'),
    detail: log('detail'),
    addSink: (sink) => sinks.push(sink),
  };
}

export const silentLogger = (): Logger => createLogger({ write: () => undefined });
