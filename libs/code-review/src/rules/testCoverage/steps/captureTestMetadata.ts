import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { createRetryLoop } from '../../../graph/createRetryLoop';
import type { AgentProvider } from '../../../providers/AgentProvider';
import { stopWhenProviderUnavailable } from '../../../providers/agentFailure';
import { analyzeStructured } from '../../../providers/analyzeStructured';
import type { Logger } from '../../../shared/logger';
import type { RunArtifacts } from '../../../shared/runArtifacts';
import { buildMetadataPrompt, PROJECT_CONTEXT_FILES } from '../prompts/metadataPrompt';
import { measureFileCoverage, TestMetadataSchema, type TestMetadata } from './measureFileCoverage';

const MAX_METADATA_ATTEMPTS = 3;

function cacheFileFor({ projectRoot, run }: { projectRoot: string; run: RunArtifacts }): string {
  const configFingerprint = PROJECT_CONTEXT_FILES.map((name) => path.join(projectRoot, name))
    .filter((file) => fs.existsSync(file))
    .map((file) => `${file}:${fs.statSync(file).size}:${fs.readFileSync(file, 'utf8')}`)
    .join('\n');
  const key = crypto
    .createHash('sha1')
    .update(`${projectRoot}\n${configFingerprint}`)
    .digest('hex')
    .slice(0, 16);
  return path.join(run.reviewDirectory, 'cache', 'metadata', `${path.basename(projectRoot)}-${key}.json`);
}

function readCachedMetadata(cacheFile: string): TestMetadata | undefined {
  if (!fs.existsSync(cacheFile)) return undefined;
  try {
    const parsed = TestMetadataSchema.extend({ projectRoot: z.string().min(1) }).safeParse(
      JSON.parse(fs.readFileSync(cacheFile, 'utf8')),
    );
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export async function captureTestMetadata({
  workspaceRoot,
  projectRoot,
  sampleSourceFile,
  provider,
  logger,
  run,
}: {
  workspaceRoot: string;
  projectRoot: string;
  sampleSourceFile: string;
  provider: AgentProvider;
  logger: Logger;
  run: RunArtifacts;
}): Promise<TestMetadata> {
  const projectLogger = logger.child(path.relative(workspaceRoot, projectRoot) || '.');
  const cacheFile = cacheFileFor({ projectRoot, run });

  const cached = readCachedMetadata(cacheFile);
  if (cached) {
    try {
      const proof = await measureFileCoverage({ metadata: cached, sourcePath: sampleSourceFile, run });
      projectLogger.success(
        `reused cached test metadata (dry run measured ${proof.lines}% lines, no AI call)`,
      );
      return cached;
    } catch (error) {
      projectLogger.warn(
        `cached test metadata no longer works, capturing again: ${(error as Error).message.split('\n')[0]}`,
      );
    }
  }

  const metadataLoop = createRetryLoop<null, TestMetadata>({
    name: 'capture test metadata',
    maxAttempts: MAX_METADATA_ATTEMPTS,
    retryChecks: [stopWhenProviderUnavailable],
    attempt: async ({ history }) => {
      const prompt = buildMetadataPrompt({ workspaceRoot, projectRoot, sampleSourceFile, history });
      const answer = await analyzeStructured({
        provider,
        task: 'capture-test-metadata',
        prompt,
        schema: TestMetadataSchema,
        cwd: projectRoot,
        logger: projectLogger,
        maxAttempts: 1,
      });
      return { ...answer, projectRoot };
    },
    evaluate: async ({ result: metadata }) => {
      const proof = await measureFileCoverage({ metadata: metadata!, sourcePath: sampleSourceFile, run });
      return {
        passed: true,
        feedback: `dry run measured ${proof.lines}% lines on ${path.basename(sampleSourceFile)} with: ${metadata!.coverageCommand}`,
      };
    },
  });

  const outcome = await metadataLoop.run({ context: null, logger: projectLogger });
  if (!outcome.passed || !outcome.lastResult) {
    throw new Error(`could not capture working test metadata: ${outcome.lastEvaluation?.feedback}`);
  }

  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, `${JSON.stringify(outcome.lastResult, null, 2)}\n`);
  return outcome.lastResult;
}
