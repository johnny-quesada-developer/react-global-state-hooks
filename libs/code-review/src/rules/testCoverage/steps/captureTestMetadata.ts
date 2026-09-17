import path from 'node:path';
import { createRetryLoop } from '../../../graph/createRetryLoop';
import type { AgentProvider } from '../../../providers/AgentProvider';
import { stopWhenProviderUnavailable } from '../../../providers/agentFailure';
import { analyzeStructured } from '../../../providers/analyzeStructured';
import type { Logger } from '../../../shared/logger';
import type { RunArtifacts } from '../../../shared/runArtifacts';
import { buildMetadataPrompt } from '../prompts/metadataPrompt';
import { measureFileCoverage, TestMetadataSchema, type TestMetadata } from './measureFileCoverage';

const MAX_METADATA_ATTEMPTS = 3;

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
  return outcome.lastResult;
}
