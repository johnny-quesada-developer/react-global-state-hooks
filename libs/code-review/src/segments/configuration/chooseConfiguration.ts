import type { CliOptions, ReviewContext } from '../../pipeline/ReviewContext';
import {
  describeLocalState,
  hasReusableConfiguration,
  loadLocalState,
  type LocalState,
} from '../../shared/reviewConfig';

export type ConfigurationMode = 'reuse' | 'stepByStep';

export function applySavedConfiguration({
  options,
  saved,
}: {
  options: CliOptions;
  saved: LocalState;
}): CliOptions {
  return {
    ...options,
    provider: options.provider ?? saved.provider,
    model: options.model ?? saved.models?.capable,
    fastModel: options.fastModel ?? saved.models?.fast,
    permissions: options.permissions ?? saved.permissions,
    concurrency: options.concurrency ?? saved.concurrency,
    goal: options.goal ?? saved.coverage?.goal,
    maxCoverageAttempts: options.maxCoverageAttempts ?? saved.coverage?.maxCoverageAttempts,
    maxQualityAttempts: options.maxQualityAttempts ?? saved.coverage?.maxQualityAttempts,
    testSuffix: options.testSuffix ?? saved.coverage?.testSuffix,
    reusedConfiguration: true,
  };
}

export async function chooseConfiguration(context: ReviewContext): Promise<ReviewContext> {
  const { options, ask, logger, workspaceRoot } = context;
  const saved = loadLocalState(workspaceRoot);
  const wantsFreshSetup = options.configuration === 'stepByStep' || options.provider === 'fake';
  if (wantsFreshSetup || !hasReusableConfiguration(saved)) return context;

  const mode =
    options.configuration ??
    (await ask.select<ConfigurationMode>({
      message: 'How do you want to configure this run?',
      defaultValue: 'reuse',
      choices: [
        {
          value: 'reuse',
          label: 'Reuse the last configuration (recommended)',
          hint: describeLocalState(saved),
        },
        {
          value: 'stepByStep',
          label: 'Configure step by step',
          hint: 'provider, models, permissions, rule options',
        },
      ],
    }));

  if (mode === 'stepByStep') return context;
  logger.detail(`reusing: ${describeLocalState(saved)} (flags you passed still win)`);
  return { ...context, options: applySavedConfiguration({ options, saved }) };
}
