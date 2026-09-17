import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { createCliProvider, type AgentProvider } from '../../providers/AgentProvider';
import { createFakeProvider } from '../../providers/fakeProvider';
import { providerCatalog } from '../../providers/providerCatalog';
import type { EditMode, ProviderId } from '../../providers/ProviderDefinition';
import { loadReviewConfig, saveReviewConfig, type ReviewConfig } from '../../shared/reviewConfig';
import type { ReviewContext } from '../../pipeline/ReviewContext';
import { detectInstalledProviders, type DetectedProvider } from './detectInstalledProviders';
import { rankInstalledProviders, suggestEditMode, type RankedProvider } from './recommendProvider';

const SetupState = Annotation.Root({
  context: Annotation<ReviewContext>(),
  savedConfig: Annotation<ReviewConfig | undefined>(),
  detected: Annotation<DetectedProvider[]>(),
  ranked: Annotation<RankedProvider[]>(),
  chosen: Annotation<RankedProvider | undefined>(),
  model: Annotation<string | undefined>(),
  editMode: Annotation<EditMode | undefined>(),
  provider: Annotation<AgentProvider | undefined>(),
});
type State = typeof SetupState.State;

const wantsFakeProvider = ({ context }: State) => context.options.provider === 'fake';

const useFakeProvider = ({ context }: State) => {
  context.logger.warn('using the fake provider: no AI calls, edits are no-ops');
  return { provider: createFakeProvider() };
};

const detectProviders = async ({ context }: State) => {
  context.logger.step('detecting installed AI CLIs (no AI involved)');
  const detected = await detectInstalledProviders({
    catalog: providerCatalog,
    workspaceRoot: context.workspaceRoot,
  });
  detected.forEach(({ definition, isInstalled, binary, auth }) => {
    const status = isInstalled ? `found at ${binary} (auth: ${auth})` : 'not installed';
    context.logger.detail(`${definition.label}: ${status}`);
  });
  return {
    detected,
    ranked: rankInstalledProviders(detected),
    savedConfig: loadReviewConfig(context.workspaceRoot),
  };
};

const printInstallGuide = ({ context, detected }: State) => {
  context.logger.error(
    'no supported AI CLI is installed. Install one of these, log in, then run `yarn review` again:',
  );
  detected.forEach(({ definition }) => {
    context.logger.info(
      `${definition.label}\n    install: ${definition.installHint}\n    login:   ${definition.loginHint}`,
    );
  });
  return {};
};

const chooseProvider = async ({ context, ranked, savedConfig }: State) => {
  const requestedId = context.options.provider as ProviderId | undefined;
  const requested = ranked.find(({ definition }) => definition.id === requestedId);
  if (requestedId && !requested)
    throw new Error(`--provider ${requestedId} is not installed on this machine`);
  if (requested) return { chosen: requested };

  const saved = ranked.find(({ definition }) => definition.id === savedConfig?.provider);
  const recommended = saved ?? ranked[0];
  const choiceId = await context.ask.select({
    message: 'Which AI provider should the review use?',
    defaultValue: recommended.definition.id,
    choices: ranked.map((provider) => ({
      value: provider.definition.id,
      label:
        provider === recommended ? `${provider.definition.label} (recommended)` : provider.definition.label,
      hint: provider === saved ? `${provider.reason}, last used` : provider.reason,
    })),
  });
  return { chosen: ranked.find(({ definition }) => definition.id === choiceId) };
};

const chooseModel = async ({ context, chosen, savedConfig }: State) => {
  if (context.options.model) return { model: context.options.model };
  const definition = chosen!.definition;
  const savedModel = savedConfig?.provider === definition.id ? savedConfig.model : undefined;
  const model = await context.ask.text({
    message: `Model for ${definition.label} (one small task per file → fastest/cheapest is enough)`,
    defaultValue: savedModel ?? definition.fastModel,
  });
  return { model };
};

const chooseEditMode = async ({ context, chosen, savedConfig }: State) => {
  if (context.options.editMode) return { editMode: context.options.editMode };
  const suggestion = suggestEditMode(chosen!.editApproval);
  const savedEditMode = savedConfig?.provider === chosen!.definition.id ? savedConfig.editMode : undefined;
  const editMode = await context.ask.select<EditMode>({
    message: 'How should the agent apply edits? (your provider permission settings always apply)',
    defaultValue: savedEditMode ?? suggestion.mode,
    choices: [
      {
        value: 'headless',
        label: 'Headless',
        hint:
          suggestion.mode === 'headless'
            ? suggestion.reason
            : 'runs non-interactively; denied edits fail the attempt',
      },
      {
        value: 'interactive',
        label: 'Interactive',
        hint:
          suggestion.mode === 'interactive'
            ? suggestion.reason
            : 'opens the CLI session so you can approve edits',
      },
    ],
  });
  return { editMode };
};

const createProvider = ({ context, chosen, model, editMode }: State) => {
  const config: ReviewConfig = {
    provider: chosen!.definition.id as ReviewConfig['provider'],
    model: model!,
    editMode: editMode!,
  };
  saveReviewConfig({ workspaceRoot: context.workspaceRoot, config });
  context.logger.success(`provider ready: ${chosen!.definition.label} · model ${model} · ${editMode} edits`);
  const provider = createCliProvider({
    definition: chosen!.definition,
    binary: chosen!.binary!,
    model: model!,
    editMode: editMode!,
    run: context.run,
  });
  return { provider };
};

export const providerSetupGraph = new StateGraph(SetupState)
  .addNode('useFakeProvider', useFakeProvider)
  .addNode('detectProviders', detectProviders)
  .addNode('printInstallGuide', printInstallGuide)
  .addNode('chooseProvider', chooseProvider)
  .addNode('chooseModel', chooseModel)
  .addNode('chooseEditMode', chooseEditMode)
  .addNode('createProvider', createProvider)
  .addConditionalEdges(START, (state) => (wantsFakeProvider(state) ? 'useFakeProvider' : 'detectProviders'), [
    'useFakeProvider',
    'detectProviders',
  ])
  .addEdge('useFakeProvider', END)
  .addConditionalEdges(
    'detectProviders',
    ({ ranked }) => (ranked.length === 0 ? 'printInstallGuide' : 'chooseProvider'),
    ['printInstallGuide', 'chooseProvider'],
  )
  .addEdge('printInstallGuide', END)
  .addEdge('chooseProvider', 'chooseModel')
  .addEdge('chooseModel', 'chooseEditMode')
  .addEdge('chooseEditMode', 'createProvider')
  .addEdge('createProvider', END)
  .compile({ name: 'provider-setup' });

export async function setupProvider(context: ReviewContext): Promise<AgentProvider | undefined> {
  const { provider } = await providerSetupGraph.invoke({ context });
  return provider;
}
