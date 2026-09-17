import { parseArgs } from 'node:util';
import * as prompts from '@clack/prompts';
import { runReviewPipeline } from './pipeline/reviewPipeline';
import type { CliOptions, ReviewContext } from './pipeline/ReviewContext';
import type { PermissionScope } from './providers/ProviderDefinition';
import { loadRules } from './segments/rules/loadRules';
import { createAsk } from './shared/ask';
import { createLogger } from './shared/logger';
import { loadProjectConfig, PROJECT_CONFIG_FILE } from './shared/projectConfig';
import { createRunArtifacts } from './shared/runArtifacts';
import { findWorkspaceRoot } from './shared/workspace';
import { createRuleWizard } from './wizard/createRuleWizard';

const USAGE = `yarn review [target...] [options]      review files with every rule
yarn review rule create [options]      wizard: create a prompt-based rule (JSON or TS)
yarn review rule list                  list the rules the pipeline would run

target: one or more of: file, folder, glob, nx project name, commit sha or "changes" (asked when omitted)

options:
  --provider <claude|codex|kiro>         skip provider selection
  --model <model>                        capable model for agent edits
  --fast-model <model>                   fast model for metadata and scoring
  --permissions <workspace|projects>     skip the permissions question
  --goal <percent>                       coverage goal per file (default 80)
  --max-coverage-attempts <n>            agent attempts to reach coverage (default 3)
  --max-quality-attempts <n>             agent attempts to fix test quality (default 2)
  --test-suffix <test|spec>              naming for new test files
  --rule <id>                            run only this rule (repeatable)
  --concurrency <n>                      files processed in parallel (default from review.config.json: 1)
  --verbose                              show the agent's tool calls even for multi-file runs
  --reuse / --fresh                      reuse the last saved configuration, or configure step by step
  --yes                                  accept defaults for every question (reuses the last configuration when there is one)
  --help

shared config: ${PROJECT_CONFIG_FILE} at the workspace root (rules directory, models per provider, bash permissions)`;

const toNumber = (value: string | undefined) => (value === undefined ? undefined : Number(value));

function parseCliOptions(argv: string[]): { options: CliOptions; command: string[] } | undefined {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
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
      yes: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
  });
  if (values.help) return undefined;

  const isRuleCommand = positionals[0] === 'rule';
  return {
    command: isRuleCommand ? positionals : [],
    options: {
      targets: isRuleCommand ? [] : positionals,
      provider: values.provider,
      model: values.model,
      fastModel: values['fast-model'],
      permissions: values.permissions as PermissionScope | undefined,
      goal: toNumber(values.goal),
      maxCoverageAttempts: toNumber(values['max-coverage-attempts']),
      maxQualityAttempts: toNumber(values['max-quality-attempts']),
      testSuffix: values['test-suffix'],
      rules: values.rule,
      verbose: values.verbose,
      concurrency: toNumber(values.concurrency),
      configuration: values.fresh ? 'stepByStep' : values.reuse ? 'reuse' : undefined,
      acceptDefaults: values.yes,
    },
  };
}

function createContext(options: CliOptions): ReviewContext {
  const invocationDirectory = process.env.INIT_CWD ?? process.cwd();
  const workspaceRoot = findWorkspaceRoot(invocationDirectory);
  const run = createRunArtifacts({ workspaceRoot });
  const logger = createLogger({ sinks: [run.recordEvent] });
  const { config: projectConfig, source } = loadProjectConfig(workspaceRoot);
  if (source === 'defaults') logger.detail(`no ${PROJECT_CONFIG_FILE} found, using defaults`);

  return {
    workspaceRoot,
    invocationDirectory,
    options,
    projectConfig,
    ask: createAsk({ logger, acceptDefaults: options.acceptDefaults }),
    logger,
    run,
  };
}

async function main() {
  const parsed = parseCliOptions(process.argv.slice(2));
  if (!parsed) {
    process.stdout.write(`${USAGE}\n`);
    return;
  }
  const context = createContext(parsed.options);
  const [, ruleAction] = parsed.command;

  if (ruleAction === 'create') {
    prompts.intro('create a review rule');
    await createRuleWizard(context);
    prompts.outro('rule created');
    return;
  }

  if (ruleAction === 'list') {
    const rules = await loadRules({ context });
    rules.forEach((rule) => context.logger.info(`${rule.id} — ${rule.title}\n    ${rule.description}`));
    return;
  }

  if (parsed.command.length)
    throw new Error(`unknown command "${parsed.command.join(' ')}". Try: yarn review rule create`);

  prompts.intro('code review pipeline');
  await runReviewPipeline({ context });
  prompts.outro('review finished');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`\n✖ review failed: ${message}\n`);
  process.exit(1);
});
