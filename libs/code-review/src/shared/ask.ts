import * as prompts from '@clack/prompts';
import type { Logger } from './logger';

export interface Choice<Value extends string> {
  value: Value;
  label: string;
  hint?: string;
}

export interface Ask {
  select: <Value extends string>(params: {
    message: string;
    choices: Choice<Value>[];
    defaultValue?: Value;
  }) => Promise<Value>;
  text: (params: { message: string; defaultValue?: string; placeholder?: string }) => Promise<string>;
  confirm: (params: { message: string; defaultValue: boolean }) => Promise<boolean>;
  number: (params: { message: string; defaultValue: number; min: number; max: number }) => Promise<number>;
}

export class MissingAnswerError extends Error {}

export function createAsk({ logger, acceptDefaults }: { logger: Logger; acceptDefaults: boolean }): Ask {
  const canPromptUser = Boolean(process.stdin.isTTY) && !acceptDefaults;

  const useDefault = <T>({
    message,
    value,
    label,
  }: {
    message: string;
    value: T | undefined;
    label?: string;
  }) => {
    if (value === undefined) {
      throw new MissingAnswerError(`"${message}" needs an answer but the terminal is not interactive.`);
    }
    logger.detail(`? ${message} → ${label ?? String(value)} (default)`);
    return value;
  };

  const exitWhenCancelled = <T>(answer: T): Exclude<T, symbol> => {
    if (prompts.isCancel(answer)) {
      prompts.cancel('Review cancelled.');
      process.exit(0);
    }
    return answer as Exclude<T, symbol>;
  };

  return {
    async select({ message, choices, defaultValue }) {
      if (!canPromptUser) {
        const label = choices.find((choice) => choice.value === defaultValue)?.label;
        return useDefault({ message, value: defaultValue, label });
      }
      const answer = await prompts.select({
        message,
        initialValue: defaultValue,
        options: choices.map(({ value, label, hint }) => ({ value, label, hint })) as never,
      });
      return exitWhenCancelled(answer) as never;
    },

    async text({ message, defaultValue, placeholder }) {
      if (!canPromptUser) return useDefault({ message, value: defaultValue });
      const answer = await prompts.text({ message, defaultValue, placeholder: placeholder ?? defaultValue });
      return exitWhenCancelled(answer) || defaultValue || '';
    },

    async confirm({ message, defaultValue }) {
      if (!canPromptUser) return useDefault({ message, value: defaultValue });
      return exitWhenCancelled(await prompts.confirm({ message, initialValue: defaultValue }));
    },

    async number({ message, defaultValue, min, max }) {
      if (!canPromptUser) return useDefault({ message, value: defaultValue });
      const answer = await prompts.text({
        message,
        defaultValue: String(defaultValue),
        placeholder: String(defaultValue),
        validate: (value) => {
          const parsed = Number(value || defaultValue);
          const isInRange = Number.isFinite(parsed) && parsed >= min && parsed <= max;
          return isInRange ? undefined : `Enter a number between ${min} and ${max}`;
        },
      });
      return Number(exitWhenCancelled(answer) || defaultValue);
    },
  };
}

export const scriptedAsk = (answers: Record<string, unknown> = {}): Ask => {
  const answerFor = <T>(message: string, defaultValue: T | undefined): T => {
    const matchingKey = Object.keys(answers).find((key) => message.includes(key));
    const answer = matchingKey ? (answers[matchingKey] as T) : defaultValue;
    if (answer === undefined) throw new MissingAnswerError(`No scripted answer for "${message}"`);
    return answer;
  };

  return {
    select: async ({ message, defaultValue }) => answerFor(message, defaultValue),
    text: async ({ message, defaultValue }) => answerFor(message, defaultValue),
    confirm: async ({ message, defaultValue }) => answerFor(message, defaultValue),
    number: async ({ message, defaultValue }) => answerFor(message, defaultValue),
  };
};
