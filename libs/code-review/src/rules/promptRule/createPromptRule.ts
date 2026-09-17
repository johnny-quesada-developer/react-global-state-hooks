import path from 'node:path';
import { minimatch } from 'minimatch';
import { createConcurrentLoop } from '../../graph/createConcurrentLoop';
import { createRetryLoop } from '../../graph/createRetryLoop';
import type { AgentProvider, AgentUsage } from '../../providers/AgentProvider';
import { analyzeStructured } from '../../providers/analyzeStructured';
import {
  addUsage,
  agentEditRetryChecks,
  canContinueSession,
  createAgentSession,
  describeEditProblems,
  describeUnsuccessfulLoop,
  emptyUsage,
  formatDuration,
  runAgentEdit,
  type AgentEditResult,
} from '../../segments/rules/agentEdit';
import type { FileResult, Rule, RuleReport, RuleRunParams } from '../../segments/rules/Rule';
import { scoreInBatches } from '../../segments/rules/scoring';
import { annotateFailure } from '../../shared/annotateFailure';
import type { Logger } from '../../shared/logger';
import { createResultCache, type ResultCache } from '../../shared/resultCache';
import { buildReviewSchema, type PromptRuleDefinition, type PromptRuleReview } from './PromptRuleDefinition';
import {
  buildRuleFixPrompt,
  buildRuleFixSystemPrompt,
  buildRuleScoreSystemPrompt,
  buildRuleScoreUserPrompt,
} from './promptRulePrompts';

export const isInScope = ({
  definition,
  relativePath,
}: {
  definition: PromptRuleDefinition;
  relativePath: string;
}) => {
  const matchesInclude = definition.scope.include.some((glob) =>
    minimatch(relativePath, glob, { dot: true }),
  );
  const matchesExclude = definition.scope.exclude.some((glob) =>
    minimatch(relativePath, glob, { dot: true }),
  );
  return matchesInclude && !matchesExclude;
};

export async function scoreFile({
  definition,
  provider,
  workspaceRoot,
  file,
  logger,
}: {
  definition: PromptRuleDefinition;
  provider: AgentProvider;
  workspaceRoot: string;
  file: string;
  logger: Logger;
}): Promise<PromptRuleReview> {
  return analyzeStructured({
    provider,
    task: `score-${definition.id}`,
    systemPrompt: buildRuleScoreSystemPrompt(definition),
    prompt: buildRuleScoreUserPrompt({ workspaceRoot, file }),
    schema: buildReviewSchema(definition),
    cwd: workspaceRoot,
    logger,
  });
}

export function judgeReview({
  definition,
  review,
}: {
  definition: PromptRuleDefinition;
  review: PromptRuleReview;
}) {
  const lowScores = Object.entries(review.scores).filter(([, value]) => value < definition.passThreshold);
  const knownBlockingFlags = new Set(definition.blockingFlags.map(({ flag }) => flag));
  const raisedBlockingFlags = review.flags.filter((flag) => knownBlockingFlags.has(flag));
  const passed = lowScores.length === 0 && raisedBlockingFlags.length === 0;
  const feedback = [
    lowScores.length
      ? `low scores: ${lowScores.map(([id, value]) => `${id} ${value}`).join(', ')}`
      : `all scores ≥ ${definition.passThreshold}`,
    raisedBlockingFlags.length ? `blocking: ${raisedBlockingFlags.join(', ')}` : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
  return { passed, feedback, lowScores, raisedBlockingFlags };
}

const minScore = (review: PromptRuleReview | undefined) =>
  review ? Math.min(...Object.values(review.scores)) : undefined;

interface FileOutcomeWithChanges {
  result: FileResult;
  changedFiles: string[];
  passed: boolean;
}

const describeUsage = ({
  review,
  attempts,
  usage,
}: {
  review: PromptRuleReview | undefined;
  attempts: number;
  usage: AgentUsage;
}) => ({
  minScore: minScore(review) ?? '—',
  flags: review?.flags.join(',') || '—',
  tries: attempts,
  cost: usage.costUsd ? `$${usage.costUsd.toFixed(2)}` : '—',
  time: formatDuration(usage.durationMs),
});

async function reviewFile({
  definition,
  params,
  file,
  initialReview,
}: {
  definition: PromptRuleDefinition;
  params: RuleRunParams;
  file: string;
  initialReview: PromptRuleReview | undefined;
}): Promise<FileOutcomeWithChanges> {
  const { context, provider } = params;
  const workspaceRoot = context.workspaceRoot;
  const relativePath = path.relative(workspaceRoot, file);
  const logger = params.logger.child(relativePath);
  const session = createAgentSession();
  const fixSystemPrompt = buildRuleFixSystemPrompt(definition);
  const progress = {
    latestReview: undefined as PromptRuleReview | undefined,
    pendingReview: initialReview,
    changedFiles: new Set<string>(),
    usage: emptyUsage(),
  };

  const loop = createRetryLoop<null, AgentEditResult | undefined>({
    name: definition.id,
    maxAttempts: definition.canFix ? definition.maxAttempts : 0,
    startWith: 'evaluation',
    retryChecks: agentEditRetryChecks,
    attempt: async ({ history }) => {
      const prompt = buildRuleFixPrompt({
        mode: canContinueSession({ provider, session }) ? 'continue' : 'fresh',
        workspaceRoot,
        file,
        review: progress.latestReview,
        history,
      });
      const edit = await runAgentEdit({
        provider,
        task: `fix-${definition.id}`,
        prompt,
        systemPrompt: fixSystemPrompt,
        session,
        workspaceRoot,
        logger,
      });
      progress.usage = addUsage(progress.usage, edit.outcome.usage);
      return edit;
    },
    evaluate: async ({ result }) => {
      result?.changedFiles.forEach((changed) => progress.changedFiles.add(changed));
      const pending = progress.pendingReview;
      progress.pendingReview = undefined;
      progress.latestReview =
        pending ?? (await scoreFile({ definition, provider, workspaceRoot, file, logger }));
      const verdict = judgeReview({ definition, review: progress.latestReview });
      return {
        passed: verdict.passed,
        feedback: [verdict.feedback, ...(result ? describeEditProblems(result) : [])].join(' · '),
        scores: progress.latestReview.scores,
        flags: progress.latestReview.flags,
        changedFiles: result?.changedFiles.map((changed) => path.relative(workspaceRoot, changed)),
      };
    },
  });

  const outcome = await loop.run({ context: null, logger });
  const status = outcome.passed
    ? outcome.attemptsUsed > 0
      ? 'fixed'
      : 'compliant'
    : definition.canFix
      ? 'fixFailed'
      : 'nonCompliant';
  const reason = outcome.passed
    ? (outcome.lastEvaluation?.feedback ?? 'passed')
    : describeUnsuccessfulLoop({
        attemptsUsed: outcome.attemptsUsed,
        stopReason: outcome.stopReason,
        lastFeedback: outcome.lastEvaluation?.feedback,
      });

  const leavesFailedEdits = !outcome.passed && outcome.attemptsUsed > 0;
  if (leavesFailedEdits && annotateFailure({ file, ruleId: definition.id, reason })) {
    logger.warn(`left a [TODO] comment in ${relativePath}`);
    progress.changedFiles.add(file);
  }

  return {
    passed: outcome.passed,
    result: {
      file: relativePath,
      status,
      outcome: outcome.passed ? 'passed' : 'failed',
      reason,
      details: describeUsage({
        review: progress.latestReview,
        attempts: outcome.attemptsUsed,
        usage: progress.usage,
      }),
      history: { [definition.id]: outcome.history },
    },
    changedFiles: [...progress.changedFiles],
  };
}

const skippedResult = ({
  file,
  status,
  reason,
}: {
  file: string;
  status: string;
  reason: string;
}): FileOutcomeWithChanges => ({
  passed: status === 'compliant',
  result: { file, status, outcome: status === 'compliant' ? 'passed' : 'skipped', reason, details: {} },
  changedFiles: [],
});

export function createPromptRule(definition: PromptRuleDefinition): Rule {
  return {
    id: definition.id,
    title: definition.title,
    description: definition.description,
    async run(params): Promise<RuleReport> {
      const { workspaceRoot, projectConfig, options, run } = params.context;
      const relative = (file: string) => path.relative(workspaceRoot, file);
      const cache: ResultCache = createResultCache({
        reviewDirectory: run.reviewDirectory,
        ruleId: definition.id,
      });

      const classified = params.files.map((file) => {
        const relativePath = relative(file);
        if (!isInScope({ definition, relativePath }))
          return {
            file,
            skip: skippedResult({
              file: relativePath,
              status: 'outOfScope',
              reason: 'not in the rule scope',
            }),
          };
        if (cache.readPass(cache.keyFor({ files: [file] }))) {
          return {
            file,
            skip: skippedResult({
              file: relativePath,
              status: 'compliant',
              reason: 'passed in a previous run, unchanged since (cache)',
            }),
          };
        }
        return { file, skip: undefined };
      });

      const toReview = classified.filter(({ skip }) => !skip).map(({ file }) => file);
      const initialReviews =
        toReview.length > 1
          ? await scoreInBatches({
              provider: params.provider,
              task: `score-${definition.id}`,
              systemPrompt: buildRuleScoreSystemPrompt(definition),
              items: toReview.map((file) => ({
                file: relative(file),
                section: buildRuleScoreUserPrompt({ workspaceRoot, file }),
              })),
              itemSchema: buildReviewSchema(definition),
              batchSize: projectConfig.agent.scoreBatchSize,
              cwd: workspaceRoot,
              logger: params.logger,
            })
          : new Map<string, PromptRuleReview>();

      const loop = createConcurrentLoop<
        { file: string; skip?: FileOutcomeWithChanges },
        FileOutcomeWithChanges
      >({
        name: definition.id,
        concurrency: options.concurrency ?? projectConfig.agent.concurrency,
        canRunTogether: (left, right) => path.dirname(left.file) !== path.dirname(right.file),
        processItem: async ({ file, skip }, { index, total }) => {
          if (skip) return skip;
          params.logger.step(`${index + 1}/${total} ${relative(file)}`);
          const outcome = await reviewFile({
            definition,
            params,
            file,
            initialReview: initialReviews.get(relative(file)),
          });
          if (outcome.passed)
            cache.rememberPass(cache.keyFor({ files: [file] }), { status: outcome.result.status });
          return outcome;
        },
      });

      const outcomes = await loop.run(classified);
      const targets = new Set(params.files);
      return {
        ruleId: definition.id,
        title: definition.title,
        fileResults: outcomes.map(({ result }) => result),
        notes: [],
        changedOutsideTargets: [...new Set(outcomes.flatMap(({ changedFiles }) => changedFiles))]
          .filter((changed) => !targets.has(changed))
          .map(relative)
          .sort(),
      };
    },
  };
}
