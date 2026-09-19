import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { ReviewContext } from '../pipeline/ReviewContext';
import { createCliProvider, type AgentProvider } from '../providers/AgentProvider';
import { analyzeStructured } from '../providers/analyzeStructured';
import { findBinary } from '../segments/providerSetup/detectInstalledProviders';
import { setupProvider } from '../segments/providerSetup/providerSetupGraph';
import { runCommand } from '../shared/exec';
import { PACKAGE_NAME } from '../shared/packageName';

const ArgvTemplate = z
  .array(z.string())
  .min(1)
  .describe('literal argv tokens, one element per token — never a single string containing spaces');

const DraftProviderSchema = z.object({
  fastModel: z.string(),
  capableModel: z.string(),
  installHint: z.string(),
  loginHint: z.string(),
  authCheckArgs: ArgvTemplate,
  analyzeArgs: ArgvTemplate,
  editArgs: ArgvTemplate,
  notes: z.string(),
});
type DraftProvider = z.infer<typeof DraftProviderSchema>;

const MAX_DRAFTS = 3;
const analysisOnlyGrant = { scope: 'projects' as const, editDirectories: [], bashPatterns: [] };

export async function createProviderWizard(context: ReviewContext): Promise<string> {
  const { ask, logger, workspaceRoot, providersDirectory } = context;

  const answers = await askProviderBasics(context);
  const bootstrapChoice = await setupProvider(context);
  if (!bootstrapChoice) throw new Error('an existing, working provider is required to draft a new one with');
  const draftingProvider = bootstrapChoice.createProvider({ grant: analysisOnlyGrant, showAgentActivity: false });

  const draft = await draftUntilAccepted({ context, draftingProvider, answers });
  await proveLive({ context, answers, draft });

  const file = await writeProviderFile({ ask, providersDirectory, answers, draft });
  logger.success(
    `provider saved: ${path.relative(workspaceRoot, file)} → run it with: review <target> --provider ${answers.id}`,
  );
  return file;
}

async function askProviderBasics({ ask }: ReviewContext) {
  const id = await ask.text({ message: 'Provider id (kebab-case, e.g. my-agent-cli)', placeholder: 'my-agent-cli' });
  const label = await ask.text({ message: 'Label (shown to users)', defaultValue: id });
  const binaryNamesRaw = await ask.text({
    message: 'Binary name(s) to search for on PATH (space separated)',
    defaultValue: id,
  });
  const docsInput = await ask.text({
    message: "Docs for the CLI's non-interactive/scripted mode — paste text, or a path to a file (e.g. `<binary> --help > help.txt`)",
    placeholder: 'path/to/help.txt',
  });
  return {
    id,
    label,
    binaryNames: binaryNamesRaw.split(/\s+/).filter(Boolean),
    docs: readDocsInput(docsInput),
  };
}

function readDocsInput(value: string): string {
  const trimmed = value.trim();
  const isFile = trimmed && fs.existsSync(trimmed) && fs.statSync(trimmed).isFile();
  return isFile ? fs.readFileSync(trimmed, 'utf8') : trimmed;
}

const buildDraftPrompt = ({
  answers,
  guidance,
}: {
  answers: Awaited<ReturnType<typeof askProviderBasics>>;
  guidance: string;
}) =>
  `Draft a minimal, working adapter for the AI CLI "${answers.label}" (binary: ${answers.binaryNames.join(' or ')}) so it can be driven non-interactively.

Reference docs for this CLI's non-interactive/scripted mode:
${answers.docs || '(none provided — use your best documented knowledge of this CLI, and flag anything you are not sure about in "notes")'}

Produce, as literal argv arrays (one array element per argv token — never one string containing spaces):
- authCheckArgs: a fast, non-interactive command whose exit code 0 means "logged in" (e.g. ["login","status"] or ["whoami"]).
- analyzeArgs: argv for a ONE-SHOT, read-only, non-interactive prompt call that prints a text/JSON response and exits. Include the literal placeholders {{model}} and {{prompt}} exactly where the model name and the prompt text belong (the prompt is usually the last/positional argument).
- editArgs: the same, but for a call that also enables this CLI's own file-editing tools (whatever flag turns on write access).
- fastModel / capableModel: reasonable default model names for this CLI (fast = small/cheap for scoring, capable = the one used for edits).
- installHint / loginHint: one line of human instructions each.
- notes: anything you are unsure about, or things a human should verify before trusting this beyond a single prompt call (empty string if none).
${guidance ? `\nExtra guidance from the user: ${guidance}` : ''}`;

async function draftUntilAccepted({
  context,
  draftingProvider,
  answers,
}: {
  context: ReviewContext;
  draftingProvider: AgentProvider;
  answers: Awaited<ReturnType<typeof askProviderBasics>>;
}): Promise<DraftProvider> {
  const { ask, logger, workspaceRoot } = context;
  let guidance = '';

  for (let round = 1; round <= MAX_DRAFTS; round += 1) {
    logger.step(`drafting the ${answers.label} adapter with ${draftingProvider.models.fast} (${round}/${MAX_DRAFTS})`);
    const draft = await analyzeStructured({
      provider: draftingProvider,
      task: 'draft-provider',
      prompt: buildDraftPrompt({ answers, guidance }),
      schema: DraftProviderSchema,
      cwd: workspaceRoot,
      logger,
    });

    logger.info(`auth check: ${draft.authCheckArgs.join(' ')}`);
    logger.info(`analyze call: ${draft.analyzeArgs.join(' ')}`);
    logger.info(`edit call: ${draft.editArgs.join(' ')}`);
    if (draft.notes) logger.info(`notes: ${draft.notes}`);

    const accepted = await ask.confirm({ message: 'Use this draft?', defaultValue: true });
    if (accepted) return draft;
    guidance = await ask.text({
      message: 'What should change?',
      placeholder: 'e.g. the real flag for the model is --llm, not --model',
    });
  }
  throw new Error(`no draft accepted after ${MAX_DRAFTS} rounds`);
}

const substitute = (args: string[], values: Record<string, string>) =>
  args.map((arg) => arg.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => values[key] ?? ''));

/**
 * Proves the draft against the real binary before anything is written to disk: a real
 * `checkAuthentication` call (informational — the user may just not be logged in yet) and one
 * real `analyze()` call with a trivial prompt, the direct equivalent of `proveOnSampleFile` in
 * `createRuleWizard.ts` for a rule. Nothing is trusted on schema validity alone.
 */
async function proveLive({
  context,
  answers,
  draft,
}: {
  context: ReviewContext;
  answers: Awaited<ReturnType<typeof askProviderBasics>>;
  draft: DraftProvider;
}) {
  const { logger, workspaceRoot } = context;
  const binary = findBinary({ binaryNames: answers.binaryNames, knownInstallLocations: [], pathEnvironment: process.env.PATH ?? '' });
  if (!binary) {
    logger.warn(`${answers.binaryNames.join('/')} was not found on PATH; skipping the live dry run`);
    return;
  }

  const definition = draftToProviderDefinition({ answers, draft });
  const auth = await definition.checkAuthentication({ binary, workspaceRoot });
  logger.detail(`auth check → ${auth}`);

  logger.step('dry run: one real analyze() call, to prove the drafted command actually works');
  const provider = createCliProvider({
    definition,
    binary,
    models: { fast: draft.fastModel, capable: draft.capableModel },
    grant: analysisOnlyGrant,
    limits: { maxBudgetUsd: context.settings.agent.maxBudgetUsdPerAttempt, timeoutMs: 60_000 },
    run: context.run,
    workspaceRoot,
    showAgentActivity: false,
  });
  const response = await provider.analyze({
    task: 'provider-dry-run',
    prompt: 'Reply with exactly this JSON object and nothing else: {"ok":true}',
    jsonSchema: { type: 'object', properties: { ok: { const: true } }, required: ['ok'] },
    cwd: workspaceRoot,
  });
  logger.success(`dry run ok → ${response.trim().slice(0, 200)}`);
}

function draftToProviderDefinition({
  answers,
  draft,
}: {
  answers: Awaited<ReturnType<typeof askProviderBasics>>;
  draft: DraftProvider;
}) {
  return {
    id: answers.id,
    label: answers.label,
    binaryNames: answers.binaryNames,
    knownInstallLocations: () => [],
    installHint: draft.installHint,
    loginHint: draft.loginHint,
    models: { fast: draft.fastModel, capable: draft.capableModel },
    supportsSessions: false,
    reportsPermissionDenials: false,
    async checkAuthentication({ binary, workspaceRoot }: { binary: string; workspaceRoot: string }) {
      const result = await runCommand({ command: binary, args: draft.authCheckArgs, cwd: workspaceRoot, timeoutMs: 15_000 });
      return result.exitCode === 0 ? ('authenticated' as const) : ('unknown' as const);
    },
    describeGrant: () => ['(permission scoping not wired up for this drafted provider yet — see the generated file)'],
    analyzeCommand: ({ model, prompt }: { model: string; prompt: string }) => ({
      args: substitute(draft.analyzeArgs, { model, prompt }),
    }),
    readAnalyzeOutput: ({ stdout }: { stdout: string }) => ({ text: stdout }),
    editCommand: ({ model, prompt }: { model: string; prompt: string }) => ({
      args: substitute(draft.editArgs, { model, prompt }),
    }),
    parseEditLine: (line: string) => (line.trim() ? [{ kind: 'text' as const, text: line }] : []),
  };
}

async function writeProviderFile({
  ask,
  providersDirectory,
  answers,
  draft,
}: {
  ask: ReviewContext['ask'];
  providersDirectory: string;
  answers: Awaited<ReturnType<typeof askProviderBasics>>;
  draft: DraftProvider;
}): Promise<string> {
  fs.mkdirSync(providersDirectory, { recursive: true });
  const file = path.join(providersDirectory, `${answers.id}.provider.ts`);
  if (fs.existsSync(file)) {
    const overwrite = await ask.confirm({ message: `${path.basename(file)} exists. Overwrite?`, defaultValue: false });
    if (!overwrite) throw new Error(`provider not saved, ${file} already exists`);
  }
  fs.writeFileSync(file, renderProviderFile({ answers, draft }));
  return file;
}

export function renderProviderFile({
  answers,
  draft,
}: {
  answers: Awaited<ReturnType<typeof askProviderBasics>>;
  draft: DraftProvider;
}): string {
  return `import { defineProvider, runCommand } from '${PACKAGE_NAME}';

// Generated by \`review provider create\` and proven with one live analyze() call before being
// saved. This is a MINIMAL starting point, not a finished adapter: session resume, per-folder
// permission scoping, and structured denied-action reporting are not wired up — edit freely once
// you've confirmed this CLI's real behavior beyond a single prompt call.
${draft.notes ? `// Notes from the draft: ${draft.notes}\n` : ''}
const substitute = (args: string[], values: Record<string, string>) =>
  args.map((arg) => arg.replace(/\\{\\{(\\w+)\\}\\}/g, (_match, key: string) => values[key] ?? ''));

export default defineProvider({
  id: ${JSON.stringify(answers.id)},
  label: ${JSON.stringify(answers.label)},
  binaryNames: ${JSON.stringify(answers.binaryNames)},
  knownInstallLocations: () => [],
  installHint: ${JSON.stringify(draft.installHint)},
  loginHint: ${JSON.stringify(draft.loginHint)},
  models: { fast: ${JSON.stringify(draft.fastModel)}, capable: ${JSON.stringify(draft.capableModel)} },
  supportsSessions: false,
  reportsPermissionDenials: false,

  async checkAuthentication({ binary, workspaceRoot }) {
    const result = await runCommand({ command: binary, args: ${JSON.stringify(draft.authCheckArgs)}, cwd: workspaceRoot, timeoutMs: 15_000 });
    return result.exitCode === 0 ? 'authenticated' : 'unknown';
  },

  describeGrant: () => ['(permission scoping not wired up yet — edits run wherever ${answers.label} itself allows)'],

  analyzeCommand: ({ model, prompt }) => ({ args: substitute(${JSON.stringify(draft.analyzeArgs)}, { model, prompt }) }),

  readAnalyzeOutput: ({ stdout }) => ({ text: stdout }),

  editCommand: ({ model, prompt }) => ({ args: substitute(${JSON.stringify(draft.editArgs)}, { model, prompt }) }),

  parseEditLine: (line) => (line.trim() ? [{ kind: 'text', text: line }] : []),
});
`;
}
