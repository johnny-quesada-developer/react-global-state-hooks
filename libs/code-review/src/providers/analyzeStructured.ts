import { z } from 'zod';
import { createRetryLoop } from '../graph/createRetryLoop';
import { stopWhenProviderUnavailable } from './agentFailure';
import type { Logger } from '../shared/logger';
import type { AgentProvider } from './AgentProvider';
import { parseStructuredOutput } from './extractJsonBlock';

export class StructuredOutputError extends Error {}

export async function analyzeStructured<T>({
  provider,
  task,
  prompt,
  systemPrompt,
  schema,
  cwd,
  logger,
  maxAttempts = 3,
}: {
  provider: AgentProvider;
  task: string;
  prompt: string;
  systemPrompt?: string;
  schema: z.ZodType<T>;
  cwd: string;
  logger: Logger;
  maxAttempts?: number;
}): Promise<T> {
  const jsonSchema: Record<string, unknown> = z.toJSONSchema(schema, { io: 'output' });
  delete jsonSchema.$schema;
  const outputContract = [
    'Respond ONLY with one JSON object that matches this JSON schema (no prose, no markdown outside the JSON):',
    JSON.stringify(jsonSchema, null, 2),
  ].join('\n');

  const loop = createRetryLoop<null, T | string>({
    name: task,
    maxAttempts,
    retryChecks: [stopWhenProviderUnavailable],
    attempt: async ({ history }) => {
      const previousFailure = history.at(-1)?.feedback;
      const correction = previousFailure ? `\n\nYour previous response was rejected: ${previousFailure}` : '';
      const response = await provider.analyze({
        task,
        prompt: `${prompt}\n\n${outputContract}${correction}`,
        systemPrompt,
        jsonSchema,
        cwd,
      });
      const parsed = parseStructuredOutput({ text: response, schema });
      if (!parsed.success) throw new StructuredOutputError(parsed.error);
      return parsed.data;
    },
    evaluate: async () => ({ passed: true, feedback: 'structured response is valid' }),
  });

  const outcome = await loop.run({ context: null, logger });
  if (!outcome.passed) {
    throw new StructuredOutputError(`${task}: ${outcome.lastEvaluation?.feedback ?? 'no valid response'}`);
  }
  return outcome.lastResult as T;
}
