import { createJiti } from 'jiti';

/**
 * The one supported mechanism for loading arbitrary TypeScript (or JavaScript) files that live
 * in the CONSUMER's repository — settings.ts, *.rule.ts — from the installed, compiled CLI.
 * jiti transpiles on the fly, needs no build step in the consumer and no global loader install.
 */
const jiti = createJiti(import.meta.url, { interopDefault: true, moduleCache: false });

export async function loadConsumerModule<T = unknown>(absoluteFilePath: string): Promise<T> {
  return jiti.import<T>(absoluteFilePath, { default: true });
}
