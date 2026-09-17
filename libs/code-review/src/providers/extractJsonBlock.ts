import type { z } from 'zod';

const ESCAPE_CHARACTER = String.fromCharCode(27);
const ANSI_ESCAPES = new RegExp(`${ESCAPE_CHARACTER}\\[[0-9;]*[A-Za-z]`, 'g');

export type ParseResult<T> = { success: true; data: T } | { success: false; error: string };

export function parseStructuredOutput<T>({
  text,
  schema,
}: {
  text: string;
  schema: z.ZodType<T>;
}): ParseResult<T> {
  const candidate = findLastJsonCandidate(text.replace(ANSI_ESCAPES, ''));
  if (candidate === undefined)
    return { success: false, error: 'The response did not contain a JSON object.' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch (error) {
    return { success: false, error: `The JSON object could not be parsed: ${(error as Error).message}` };
  }

  const validation = schema.safeParse(parsed);
  if (validation.success) return { success: true, data: validation.data };

  const issues = validation.error.issues.map(
    (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
  );
  return { success: false, error: `The JSON does not match the schema → ${issues.join('; ')}` };
}

function findLastJsonCandidate(text: string): string | undefined {
  const fencedBlocks = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map((match) => match[1].trim());
  const lastFencedObject = fencedBlocks.reverse().find((block) => block.startsWith('{'));
  if (lastFencedObject) return lastFencedObject;

  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;

  return findLastBalancedObject(text);
}

function findLastBalancedObject(text: string): string | undefined {
  const end = text.lastIndexOf('}');
  if (end === -1) return undefined;

  let depth = 0;
  for (let index = end; index >= 0; index -= 1) {
    if (text[index] === '}') depth += 1;
    if (text[index] === '{') depth -= 1;
    const isBalanced = depth === 0;
    if (isBalanced) return text.slice(index, end + 1);
  }
  return undefined;
}
