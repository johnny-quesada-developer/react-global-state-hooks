import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { createCliProvider, type AgentProvider } from '../../providers/AgentProvider';
import { createFakeProvider } from '../../providers/fakeProvider';
import type { ModelTiers, PermissionGrant, ProviderId } from '../../providers/ProviderDefinition';
import type { ReviewContext } from '../../pipeline/ReviewContext';
import { discoverProviderFiles } from '../../shared/discoverProviders';
import { loadLocalState, rememberChoices, type LocalState } from '../../shared/reviewConfig';
import { detectInstalledProviders, type DetectedProvider } from './detectInstalledProviders';
import { rankInstalledProviders, type RankedProvider } from './recommendProvider';

export interface ProviderChoice {
  label: string;
  models: ModelTiers;
  describeGrant: (grant: PermissionGrant) => string[];
  createProvider: (params: { grant: PermissionGrant; showAgentActivity: boolean }) => AgentProvider;
}

const SetupState = Annotation.Root({
  context: Annotation<ReviewContext>(),
  localState: Annotation<LocalState | undefined>(),
  detected: Annotation<DetectedProvider[]>(),
  ranked: Annotation<RankedProvider[]>(),
  chosen: Annotation<RankedProvider | undefined>(),
  choice: Annotation<ProviderChoice | undefined>(),
});
type State = typeof SetupState.State;

const wantsFakeProvider = ({ context }: State) => context.options.provider === 'fake';

const useFakeProvider = ({ context }: State) => {
  context.logger.warn('using the fake provider: no AI calls, edits are no-ops');
  const choice: ProviderChoice = {
    label: 'Fake provider',
    models: { fast: 'none', capable: 'none' },
    describeGrant: () => ['(fake provider ignores permissions)'],
    createProvider: () => createFakeProvider(),
  };
  return { choice };
};

const detectProviders = async ({ context }: State) => {
  context.logger.step('detecting installed AI CLIs (no AI involved)');
  const catalog = await discoverProviderFiles(context.providersDirectory);
  const detected = await detectInstalledProviders({
    catalog,
    workspaceRoot: context.workspaceRoot,
  });
  detected.forEach(({ definition, isInstalled, binary, auth }) => {
    const status = isInstalled ? `found at ${binary} (auth: ${auth})` : 'not installed';
    context.logger.detail(`${definition.label}: ${status}`);
  });
  return {
    detected,
    ranked: rankInstalledProviders(detected),
    localState: loadLocalState(context.workspaceRoot),
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

const chooseProvider = async ({ context, ranked, localState }: State) => {
  const requestedId = context.options.provider as ProviderId | undefined;
  const requested = ranked.find(({ definition }) => definition.id === requestedId);
  const missingRequested = requestedId !== undefined && !requested;
  if (missingRequested && !context.options.reusedConfiguration) {
    throw new Error(`--provider ${requestedId} is not installed on this machine`);
  }
  if (missingRequested)
    context.logger.warn(`the saved provider ${requestedId} is not installed anymore, choose another`);
  if (requested) return { chosen: requested };

  const lastUsed = ranked.find(({ definition }) => definition.id === localState?.provider);
  const recommended = lastUsed ?? ranked[0];
  const choiceId = await context.ask.select({
    message: 'Which AI provider should the review use?',
    defaultValue: recommended.definition.id,
    choices: ranked.map((provider) => ({
      value: provider.definition.id,
      label:
        provider === recommended ? `${provider.definition.label} (recommended)` : provider.definition.label,
      hint: provider === lastUsed ? `${provider.reason}, last used` : provider.reason,
    })),
  });
  return { chosen: ranked.find(({ definition }) => definition.id === choiceId) };
};

const resolveModels = ({ context, chosen }: State): ModelTiers => {
  const definition = chosen!.definition;
  const configured = context.settings.providers[definition.id]?.models ?? {};
  return {
    fast: context.options.fastModel ?? configured.fast ?? definition.models.fast,
    capable: context.options.model ?? configured.capable ?? definition.models.capable,
  };
};

const prepareChoice = (state: State) => {
  const { context, chosen } = state;
  const definition = chosen!.definition;
  const models = resolveModels(state);
  const { maxBudgetUsdPerAttempt, attemptTimeoutMinutes } = context.settings.agent;
  const limits = { maxBudgetUsd: maxBudgetUsdPerAttempt, timeoutMs: attemptTimeoutMinutes * 60_000 };
  rememberChoices({
    workspaceRoot: context.workspaceRoot,
    patch: { provider: definition.id as LocalState['provider'], models },
  });
  context.logger.success(
    `provider: ${definition.label} · fast model ${models.fast} (metadata, scoring) · capable model ${models.capable} (edits)`,
  );
  context.logger.detail(
    `override models with --model / --fast-model or providers.<id>.models in settings.ts · per attempt: max $${maxBudgetUsdPerAttempt}, ${attemptTimeoutMinutes} min`,
  );

  const choice: ProviderChoice = {
    label: definition.label,
    models,
    describeGrant: (grant) => definition.describeGrant({ grant, workspaceRoot: context.workspaceRoot }),
    createProvider: ({ grant, showAgentActivity }) =>
      createCliProvider({
        definition,
        binary: chosen!.binary!,
        models,
        grant,
        limits,
        run: context.run,
        workspaceRoot: context.workspaceRoot,
        showAgentActivity,
      }),
  };
  return { choice };
};

export const providerSetupGraph = new StateGraph(SetupState)
  .addNode('useFakeProvider', useFakeProvider)
  .addNode('detectProviders', detectProviders)
  .addNode('printInstallGuide', printInstallGuide)
  .addNode('chooseProvider', chooseProvider)
  .addNode('prepareChoice', prepareChoice)
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
  .addEdge('chooseProvider', 'prepareChoice')
  .addEdge('prepareChoice', END)
  .compile({ name: 'provider-setup' });

export async function setupProvider(context: ReviewContext): Promise<ProviderChoice | undefined> {
  const { choice } = await providerSetupGraph.invoke({ context });
  return choice;
}
