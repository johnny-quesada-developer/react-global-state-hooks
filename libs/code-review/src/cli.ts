import { parseArgs } from 'node:util';
import * as prompts from '@clack/prompts';
import { runReviewPipeline } from './pipeline/reviewPipeline';
import type { CliOptions } from './pipeline/ReviewContext';
import type { EditMode } from './providers/ProviderDefinition';
import { createAsk } from './shared/ask';
import { createLogger } from './shared/logger';
import { createRunArtifacts } from './shared/runArtifacts';
import { findWorkspaceRoot } from './shared/workspace';

const USAGE = `yarn review [target] [options]

target: a file, folder, glob, nx project name, commit sha or "changes" (asked when omitted)

options:
  --provider <claude|codex|kiro>         skip provider selection
  --model <model>                        override the provider's fast model
  --edit-mode <headless|interactive>     how the agent applies edits
  --goal <percent>                       coverage goal per file (default 80)
  --max-coverage-attempts <n>            agent attempts to reach coverage (default 3)
  --max-quality-attempts <n>             agent attempts to fix test quality (default 2)
  --test-suffix <test|spec>              naming for new test files
  --rule <id>                            run only this rule (repeatable)
  --yes                                  accept defaults for every question
  --help`;

const toNumber = (value: string | undefined) => (value === undefined ? undefined : Number(value));

function parseCliOptions(argv: string[]): CliOptions | undefined {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      provider: { type: 'string' },
      model: { type: 'string' },
      'edit-mode': { type: 'string' },
      goal: { type: 'string' },
      'max-coverage-attempts': { type: 'string' },
      'max-quality-attempts': { type: 'string' },
      'test-suffix': { type: 'string' },
      rule: { type: 'string', multiple: true },
      yes: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
  });
  if (values.help) return undefined;

  return {
    target: positionals[0],
    provider: values.provider,
    model: values.model,
    editMode: values['edit-mode'] as EditMode | undefined,
    goal: toNumber(values.goal),
    maxCoverageAttempts: toNumber(values['max-coverage-attempts']),
    maxQualityAttempts: toNumber(values['max-quality-attempts']),
    testSuffix: values['test-suffix'],
    rules: values.rule,
    acceptDefaults: values.yes,
  };
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  if (!options) {
    process.stdout.write(`${USAGE}\n`);
    return;
  }

  const invocationDirectory = process.env.INIT_CWD ?? process.cwd();
  const workspaceRoot = findWorkspaceRoot(invocationDirectory);
  const run = createRunArtifacts({ workspaceRoot });
  const logger = createLogger({ sinks: [run.recordEvent] });

  prompts.intro('code review pipeline');
  await runReviewPipeline({
    context: {
      workspaceRoot,
      invocationDirectory,
      options,
      ask: createAsk({ logger, acceptDefaults: options.acceptDefaults }),
      logger,
      run,
    },
  });
  prompts.outro('review finished');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`\n✖ review failed: ${message}\n`);
  process.exit(1);
});
