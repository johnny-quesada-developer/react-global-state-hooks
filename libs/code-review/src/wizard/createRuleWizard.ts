import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import type { ReviewContext } from '../pipeline/ReviewContext';
import type { AgentProvider } from '../providers/AgentProvider';
import { analyzeStructured } from '../providers/analyzeStructured';
import { isInScope, judgeReview, scoreFile } from '../rules/promptRule/createPromptRule';
import {
  BlockingFlagSchema,
  CriterionSchema,
  PromptRuleDefinitionSchema,
  type PromptRuleDefinition,
  type PromptRuleInput,
} from '../rules/promptRule/PromptRuleDefinition';
import { setupProvider } from '../segments/providerSetup/providerSetupGraph';
import { resolveRulesDirectory } from '../shared/projectConfig';
import { isInsideIgnoredDirectory, walkFiles } from '../shared/workspace';

const DraftRuleSchema = z.object({
  criteria: z.array(CriterionSchema).min(2).max(6),
  blockingFlags: z.array(BlockingFlagSchema).max(5),
  fixInstructions: z.string(),
});
type DraftRule = z.infer<typeof DraftRuleSchema>;

const MAX_DRAFTS = 3;
const analysisOnlyGrant = { scope: 'projects' as const, editDirectories: [], bashPatterns: [] };

export async function createRuleWizard(context: ReviewContext): Promise<string> {
  const { ask, logger, workspaceRoot, projectConfig } = context;
  const rulesDirectory = resolveRulesDirectory({ workspaceRoot, config: projectConfig });

  const answers = await askRuleBasics(context);
  const choice = await setupProvider(context);
  if (!choice) throw new Error('a provider is required to draft the rule criteria');
  const provider = choice.createProvider({ grant: analysisOnlyGrant, showAgentActivity: false });

  const draft = await draftUntilAccepted({ context, provider, answers });
  const definition = PromptRuleDefinitionSchema.parse({ ...answers, ...draft } satisfies PromptRuleInput);

  await proveOnSampleFile({ context, provider, definition });

  const file = await writeRuleFile({ ask, rulesDirectory, definition, format: answers.format });
  logger.success(
    `rule saved: ${path.relative(workspaceRoot, file)} → run it with: yarn review <target> --rule ${definition.id}`,
  );
  return file;
}

async function askRuleBasics({ ask }: ReviewContext) {
  const id = await ask.text({
    message: 'Rule id (kebab-case, e.g. no-magic-numbers)',
    placeholder: 'my-rule',
  });
  const title = await ask.text({ message: 'Title', defaultValue: id.replace(/-/g, ' ') });
  const description = await ask.text({
    message: 'Describe what the rule checks, in plain language (this becomes the prompt)',
    placeholder:
      'Components must not read from global state directly; they receive data through props or hooks.',
  });
  const include = await ask.text({
    message: 'File scope (globs separated by spaces)',
    defaultValue: '**/*.{ts,tsx}',
  });
  const canFix = await ask.confirm({
    message: 'Can the agent fix violations? (otherwise the rule only reports)',
    defaultValue: true,
  });
  const maxAttempts = canFix
    ? await ask.number({ message: 'Max fix attempts per file', defaultValue: 2, min: 1, max: 10 })
    : 0;
  const format = await ask.select<'json' | 'ts'>({
    message: 'Rule file format',
    defaultValue: 'json',
    choices: [
      {
        value: 'json',
        label: 'JSON (recommended)',
        hint: 'data only, editable by hand, runs through the generic prompt-rule runner',
      },
      { value: 'ts', label: 'TypeScript', hint: 'same definition, but you can extend it with code later' },
    ],
  });
  return {
    id,
    title,
    description,
    scope: { include: include.split(/\s+/).filter(Boolean) },
    canFix,
    maxAttempts,
    format,
  };
}

const buildDraftPrompt = ({
  answers,
  guidance,
}: {
  answers: Awaited<ReturnType<typeof askRuleBasics>>;
  guidance: string;
}) =>
  `Turn this code-review rule into a deterministic scoring rubric.

Rule title: ${answers.title}
Rule description: ${answers.description}
Files in scope: ${answers.scope.include.join(', ')}
The agent ${answers.canFix ? 'may fix violations' : 'only reports violations'}.

Produce:
- criteria: 2 to 6 independent, observable criteria a reviewer can score 0-10 from the file content alone. Ids are camelCase.
- blockingFlags: up to 5 camelCase flags for violations that must fail the file regardless of scores (empty if none make sense).
- fixInstructions: short, concrete instructions for an agent fixing a violating file (empty if the rule only reports).
${guidance ? `\nExtra guidance from the user: ${guidance}` : ''}`;

async function draftUntilAccepted({
  context,
  provider,
  answers,
}: {
  context: ReviewContext;
  provider: AgentProvider;
  answers: Awaited<ReturnType<typeof askRuleBasics>>;
}): Promise<DraftRule> {
  const { ask, logger, workspaceRoot } = context;
  let guidance = '';

  for (let round = 1; round <= MAX_DRAFTS; round += 1) {
    logger.step(`drafting the rubric with ${provider.models.fast} (${round}/${MAX_DRAFTS})`);
    const draft = await analyzeStructured({
      provider,
      task: 'draft-rule',
      prompt: buildDraftPrompt({ answers, guidance }),
      schema: DraftRuleSchema,
      cwd: workspaceRoot,
      logger,
    });

    draft.criteria.forEach(({ id, title, description }) =>
      logger.info(`criterion ${id} — ${title}: ${description}`),
    );
    draft.blockingFlags.forEach(({ flag, description }) =>
      logger.info(`blocking flag ${flag}: ${description}`),
    );
    if (draft.fixInstructions) logger.info(`fix instructions: ${draft.fixInstructions}`);

    const accepted = await ask.confirm({ message: 'Use this rubric?', defaultValue: true });
    if (accepted) return draft;
    guidance = await ask.text({
      message: 'What should change in the rubric?',
      placeholder: 'e.g. add a criterion about naming',
    });
  }
  throw new Error(`no rubric accepted after ${MAX_DRAFTS} drafts`);
}

async function proveOnSampleFile({
  context,
  provider,
  definition,
}: {
  context: ReviewContext;
  provider: AgentProvider;
  definition: PromptRuleDefinition;
}) {
  const { workspaceRoot, logger } = context;
  const sampleFile = walkFiles(workspaceRoot).find((file) => {
    const relativePath = path.relative(workspaceRoot, file);
    return !isInsideIgnoredDirectory(relativePath) && isInScope({ definition, relativePath });
  });
  if (!sampleFile) {
    logger.warn(
      `no file in the workspace matches ${definition.scope.include.join(', ')}; skipping the dry run`,
    );
    return;
  }

  logger.step(
    `dry run: scoring ${path.relative(workspaceRoot, sampleFile)} to prove the rubric produces valid output`,
  );
  const review = await scoreFile({ definition, provider, workspaceRoot, file: sampleFile, logger });
  const verdict = judgeReview({ definition, review });
  logger.success(`dry run ok → ${verdict.feedback} (scores ${JSON.stringify(review.scores)})`);
}

async function writeRuleFile({
  ask,
  rulesDirectory,
  definition,
  format,
}: {
  ask: ReviewContext['ask'];
  rulesDirectory: string;
  definition: PromptRuleDefinition;
  format: 'json' | 'ts';
}): Promise<string> {
  fs.mkdirSync(rulesDirectory, { recursive: true });
  const file = path.join(rulesDirectory, `${definition.id}.rule.${format}`);
  if (fs.existsSync(file)) {
    const overwrite = await ask.confirm({
      message: `${path.basename(file)} exists. Overwrite?`,
      defaultValue: false,
    });
    if (!overwrite) throw new Error(`rule not saved, ${file} already exists`);
  }
  fs.writeFileSync(
    file,
    format === 'json' ? renderJsonRule(definition) : renderTsRule({ definition, rulesDirectory }),
  );
  return file;
}

export const renderJsonRule = (definition: PromptRuleDefinition) =>
  `${JSON.stringify(definition, null, 2)}\n`;

export function renderTsRule({
  definition,
  rulesDirectory,
}: {
  definition: PromptRuleDefinition;
  rulesDirectory: string;
}): string {
  const runnerFile = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    'rules',
    'promptRule',
    'createPromptRule',
  );
  const importPath = path.relative(rulesDirectory, runnerFile).split(path.sep).join('/');
  return `import { createPromptRule } from '${importPath.startsWith('.') ? importPath : `./${importPath}`}';

// Generated by \`yarn review rule create\`. Edit the definition freely, or replace createPromptRule
// with your own Rule implementation when the rule needs deterministic steps beyond scoring + fixing.
export default createPromptRule(${JSON.stringify(definition, null, 2)});
`;
}
