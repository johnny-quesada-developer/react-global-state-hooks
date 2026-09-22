import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import * as prompts from '@clack/prompts';
import { runReviewPipeline } from './pipeline/reviewPipeline';
import type { CliOptions, ReviewContext } from './pipeline/ReviewContext';
import type { PermissionScope } from './providers/ProviderDefinition';
import { loadRules } from './segments/rules/loadRules';
import { createAsk } from './shared/ask';
import { describeMissingConnectorError, resolveConnector } from './shared/connector';
import { discoverProviderFiles } from './shared/discoverProviders';
import { findRepositoryRoot } from './shared/git';
import { createLogger } from './shared/logger';
import { createRunArtifacts } from './shared/runArtifacts';
import { loadSettings, resolveWorkspaceRoot } from './shared/settings';
import { createProviderWizard } from './wizard/createProviderWizard';
import { createRuleWizard } from './wizard/createRuleWizard';
import { type LegacyDefaults, runInitWizard } from './wizard/initWizard';

const USAGE = `review [target...] [options]           review files with every rule
review init [options]                  scaffold a connector + settings + rules in this repo
review rule create [options]           wizard: create a prompt-based rule (JSON or TS)
review rule list                       list the rules the current connector would run
review provider create [options]       wizard: draft an adapter for a new AI CLI, proven live before it's saved
review provider list                   list built-in and custom providers

target: one or more of: file, folder, glob, project name, commit sha or "changes" (asked when omitted)

options:
  --config <path>                        explicit connector file (skips upward discovery)
  --provider <id>                        skip provider selection (claude, codex, kiro, copilot, or a custom provider id)
  --model <model>                        capable model for agent edits
  --fast-model <model>                   fast model for metadata and scoring
  --permissions <workspace|projects>     skip the permissions question
  --goal <percent>                       coverage goal per file (default 80)
  --max-coverage-attempts <n>            agent attempts to reach coverage (default 3)
  --max-quality-attempts <n>             agent attempts to fix test quality (default 2)
  --test-suffix <test|spec>              naming for new test files
  --rule <id>                            run only this rule (repeatable)
  --concurrency <n>                      files processed in parallel (default from settings.ts: 1)
  --verbose                              show the agent's tool calls even for multi-file runs
  --max-files <n>                        abort when the target resolves to more than n files
  --allow-dirty                          run even with uncommitted changes (default: refuse, so agent edits stay separable)
  --fail-on-issues                       exit with code 1 when any file fails or a rule crashes (CI)
  --reuse / --fresh                      reuse the last saved configuration, or configure step by step
  --yes                                  accept defaults for every question (reuses the last configuration when there is one)
  --help

configuration: a nearby review.config.json points at a folder (default: qa/) holding settings.ts and rules/**/*.rule.ts. Run \`review init\` if none exists yet.`;

const toNumber = (value: string | undefined) => (value === undefined ? undefined : Number(value));

function parseCliOptions(argv: string[]): { options: CliOptions; command: string[] } | undefined {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      config: { type: 'string' },
      provider: { type: 'string' },
      model: { type: 'string' },
      'fast-model': { type: 'string' },
      permissions: { type: 'string' },
      goal: { type: 'string' },
      'max-coverage-attempts': { type: 'string' },
      'max-quality-attempts': { type: 'string' },
      'test-suffix': { type: 'string' },
      rule: { type: 'string', multiple: true },
      concurrency: { type: 'string' },
      reuse: { type: 'boolean', default: false },
      fresh: { type: 'boolean', default: false },
      verbose: { type: 'boolean', default: false },
      'max-files': { type: 'string' },
      'allow-dirty': { type: 'boolean', default: false },
      'fail-on-issues': { type: 'boolean', default: false },
      yes: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
  });
  if (values.help) return undefined;

  const isCommand = positionals[0] === 'rule' || positionals[0] === 'provider' || positionals[0] === 'init';
  return {
    command: isCommand ? positionals : [],
    options: {
      targets: isCommand ? [] : positionals,
      configPath: values.config,
      provider: values.provider,
      model: values.model,
      fastModel: values['fast-model'],
      permissions: values.permissions as PermissionScope | undefined,
      concurrency: toNumber(values.concurrency),
      goal: toNumber(values.goal),
      maxCoverageAttempts: toNumber(values['max-coverage-attempts']),
      maxQualityAttempts: toNumber(values['max-quality-attempts']),
      testSuffix: values['test-suffix'],
      rules: values.rule,
      verbose: values.verbose,
      maxFiles: toNumber(values['max-files']),
      allowDirty: values['allow-dirty'],
      failOnIssues: values['fail-on-issues'],
      configuration: values.fresh ? 'stepByStep' : values.reuse ? 'reuse' : undefined,
      acceptDefaults: values.yes,
    },
  };
}

async function buildContext(options: CliOptions): Promise<ReviewContext> {
  const invocationDirectory = process.env.INIT_CWD ?? process.cwd();
  const resolved = resolveConnector({ invocationDirectory, explicitConnectorPath: options.configPath });
  if (!resolved) throw new Error(describeMissingConnectorError(invocationDirectory));

  const settings = await loadSettings({ configurationDirectory: resolved.configurationDirectory });
  const workspaceRoot = resolveWorkspaceRoot({ configurationDirectory: resolved.configurationDirectory, settings });
  const repositoryRoot = await findRepositoryRoot({ cwd: workspaceRoot });
  const run = createRunArtifacts({ workspaceRoot });
  const logger = createLogger({ sinks: [run.recordEvent] });

  return {
    invocationDirectory,
    repositoryRoot,
    connectorPath: resolved.connectorPath,
    configurationDirectory: resolved.configurationDirectory,
    rulesDirectory: path.join(resolved.configurationDirectory, 'rules'),
    providersDirectory: path.join(resolved.configurationDirectory, 'providers'),
    workspaceRoot,
    settings,
    options,
    ask: createAsk({ logger, acceptDefaults: options.acceptDefaults }),
    logger,
    run,
  };
}

const isLegacyConfigShape = (parsed: Record<string, unknown>) =>
  parsed.configurationDirectory === undefined && (parsed.providers || parsed.agent || parsed.permissions);

/**
 * Migration convenience for a repo that still has the old flat JSON config (pre-connector): reads
 * it (plus remembered `.review/config.json` state) to pre-fill `init`'s questions, then moves it
 * out of the way so it can't be confused with the new connector — explicit and non-destructive,
 * nothing is deleted, just renamed. Has no effect once the legacy file is gone.
 */
function migrateLegacyConfigIfPresent({
  invocationDirectory,
  logger,
}: {
  invocationDirectory: string;
  logger: ReturnType<typeof createLogger>;
}): LegacyDefaults | undefined {
  const legacyFile = path.join(invocationDirectory, 'review.config.json');
  if (!fs.existsSync(legacyFile)) return undefined;
  try {
    const legacy = JSON.parse(fs.readFileSync(legacyFile, 'utf8'));
    if (!isLegacyConfigShape(legacy)) return undefined;

    const localStateFile = path.join(invocationDirectory, '.review', 'config.json');
    const localState = fs.existsSync(localStateFile) ? JSON.parse(fs.readFileSync(localStateFile, 'utf8')) : {};
    const legacyDefaults: LegacyDefaults = {
      provider: localState.provider,
      models: localState.models,
      permissions: localState.permissions,
      concurrency: legacy.agent?.concurrency ?? localState.concurrency,
      maxBudgetUsdPerAttempt: legacy.agent?.maxBudgetUsdPerAttempt,
      attemptTimeoutMinutes: legacy.agent?.attemptTimeoutMinutes,
      scoreBatchSize: legacy.agent?.scoreBatchSize,
      bashPatterns: legacy.permissions?.bash,
      goal: localState.coverage?.goal,
      maxCoverageAttempts: localState.coverage?.maxCoverageAttempts,
      maxQualityAttempts: localState.coverage?.maxQualityAttempts,
    };

    const archivedFile = path.join(invocationDirectory, 'review.config.legacy.json');
    fs.renameSync(legacyFile, archivedFile);
    logger.warn(
      `found the old review.config.json format; moved it to ${path.basename(archivedFile)} (its values pre-fill the questions below) and creating the new connector`,
    );
    return legacyDefaults;
  } catch {
    return undefined;
  }
}

async function main() {
  const parsed = parseCliOptions(process.argv.slice(2));
  if (!parsed) {
    process.stdout.write(`${USAGE}\n`);
    return;
  }
  const [command, subcommand] = parsed.command;

  if (command === 'init') {
    const invocationDirectory = process.env.INIT_CWD ?? process.cwd();
    const run = createRunArtifacts({ workspaceRoot: invocationDirectory });
    const logger = createLogger({ sinks: [run.recordEvent] });
    const ask = createAsk({ logger, acceptDefaults: parsed.options.acceptDefaults });
    prompts.intro('initialize code-review');
    await runInitWizard({
      invocationDirectory,
      ask,
      logger,
      configPath: parsed.options.configPath,
      legacyDefaults: migrateLegacyConfigIfPresent({ invocationDirectory, logger }),
    });
    prompts.outro('initialized — run `review` to start');
    return;
  }

  const context = await buildContext(parsed.options);

  if (command === 'rule' && subcommand === 'create') {
    prompts.intro('create a review rule');
    await createRuleWizard(context);
    prompts.outro('rule created');
    return;
  }

  if (command === 'rule' && subcommand === 'list') {
    const rules = await loadRules({ context });
    if (!rules.length) context.logger.warn(`no rules found in ${path.relative(context.workspaceRoot, context.rulesDirectory)}`);
    rules.forEach((rule) =>
      context.logger.info(`${rule.id}${rule.disabled ? ' (disabled)' : ''} — ${rule.title}\n    ${rule.description}`),
    );
    return;
  }

  if (command === 'provider' && subcommand === 'create') {
    prompts.intro('create a review provider');
    await createProviderWizard(context);
    prompts.outro('provider created');
    return;
  }

  if (command === 'provider' && subcommand === 'list') {
    const providers = await discoverProviderFiles(context.providersDirectory);
    providers.forEach((provider) => context.logger.info(`${provider.id} — ${provider.label}`));
    return;
  }

  if (parsed.command.length) throw new Error(`unknown command "${parsed.command.join(' ')}". Try: review rule create`);

  prompts.intro('code review pipeline');
  const { reports = [] } = await runReviewPipeline({ context });
  prompts.outro('review finished');
  const hasIssues = reports.some(
    (report) => report.crashReason || report.fileResults.some(({ outcome }) => outcome === 'failed'),
  );
  if (context.options.failOnIssues && hasIssues) process.exitCode = 1;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`\n✖ review failed: ${message}\n`);
  process.exit(1);
});
