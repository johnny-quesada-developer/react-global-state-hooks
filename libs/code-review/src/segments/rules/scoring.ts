import { z } from 'zod';
import type { AgentProvider } from '../../providers/AgentProvider';
import { analyzeStructured, StructuredOutputError } from '../../providers/analyzeStructured';
import { BATCH_FILES_MARKER } from '../../providers/fakeProvider';
import type { Logger } from '../../shared/logger';

export interface ScoringItem {
  file: string;
  section: string;
}

const chunk = <T>(items: T[], size: number): T[][] =>
  items.length === 0 ? [] : [items.slice(0, size), ...chunk(items.slice(size), size)];

export async function scoreInBatches<TReview>({
  provider,
  task,
  systemPrompt,
  items,
  itemSchema,
  batchSize,
  cwd,
  logger,
}: {
  provider: AgentProvider;
  task: string;
  systemPrompt: string;
  items: ScoringItem[];
  itemSchema: z.ZodType<TReview>;
  batchSize: number;
  cwd: string;
  logger: Logger;
}): Promise<Map<string, TReview>> {
  const reviews = new Map<string, TReview>();

  const scoreOne = async ({ file, section }: ScoringItem) => {
    const review = await analyzeStructured({
      provider,
      task,
      prompt: section,
      systemPrompt,
      schema: itemSchema,
      cwd,
      logger,
    });
    reviews.set(file, review);
  };

  const scoreBatch = async (batch: ScoringItem[]) => {
    const files = batch.map(({ file }) => file);
    const batchSchema = z
      .object({ results: z.array(z.object({ file: z.string(), review: itemSchema })) })
      .refine(({ results }) => files.every((file) => results.some((result) => result.file === file)), {
        message: `results must contain one entry per file: ${files.join(', ')}`,
      });
    const prompt = [
      `Review each of the following ${files.length} files INDEPENDENTLY, as if they were separate requests.`,
      `${BATCH_FILES_MARKER} ${files.join(', ')}`,
      'Return {"results": [{"file": "<path exactly as listed>", "review": {...}}, ...]} with exactly one entry per file.',
      ...batch.map(({ file, section }) => `\n===== FILE ${file} =====\n${section}`),
    ].join('\n');

    logger.detail(`scoring ${files.length} files in one call`);
    const { results } = await analyzeStructured({
      provider,
      task,
      prompt,
      systemPrompt,
      schema: batchSchema,
      cwd,
      logger,
      maxAttempts: 2,
    });
    results.forEach(({ file, review }) => reviews.set(file, review));
  };

  const shouldBatch = batchSize > 1 && items.length > 1;
  if (!shouldBatch) {
    for (const item of items) await scoreOne(item);
    return reviews;
  }

  for (const batch of chunk(items, batchSize)) {
    if (batch.length === 1) {
      await scoreOne(batch[0]);
      continue;
    }
    try {
      await scoreBatch(batch);
    } catch (error) {
      if (!(error instanceof StructuredOutputError)) throw error;
      logger.warn(
        `batch scoring rejected (${error.message.slice(0, 120)}); scoring the ${batch.length} files one by one`,
      );
      for (const item of batch) await scoreOne(item);
    }
  }
  return reviews;
}
