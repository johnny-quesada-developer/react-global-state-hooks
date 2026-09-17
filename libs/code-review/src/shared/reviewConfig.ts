import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const ReviewConfigSchema = z.object({
  provider: z.enum(['claude', 'codex', 'kiro']),
  model: z.string().min(1),
  editMode: z.enum(['headless', 'interactive']),
});

export type ReviewConfig = z.infer<typeof ReviewConfigSchema>;

const configFile = (workspaceRoot: string) => path.join(workspaceRoot, '.review', 'config.json');

export function loadReviewConfig(workspaceRoot: string): ReviewConfig | undefined {
  const file = configFile(workspaceRoot);
  if (!fs.existsSync(file)) return undefined;
  try {
    const parsed = ReviewConfigSchema.safeParse(JSON.parse(fs.readFileSync(file, 'utf8')));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export function saveReviewConfig({
  workspaceRoot,
  config,
}: {
  workspaceRoot: string;
  config: ReviewConfig;
}): void {
  const file = configFile(workspaceRoot);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
}
