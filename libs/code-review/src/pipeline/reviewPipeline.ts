import path from 'node:path';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import type { AgentProvider } from '../providers/AgentProvider';
import { chooseConfiguration } from '../segments/configuration/chooseConfiguration';
import { grantPermissions } from '../segments/permissions/grantPermissions';
import { setupProvider, type ProviderChoice } from '../segments/providerSetup/providerSetupGraph';
import { loadRules } from '../segments/rules/loadRules';
import type { Rule, RuleReport } from '../segments/rules/Rule';
import { runRules } from '../segments/rules/runRules';
import { renderMarkdownSummary, renderTerminalSummary } from '../segments/summary/renderSummary';
import { describeTargets, type Target } from '../segments/targetSelection/detectTarget';
import { selectTarget } from '../segments/targetSelection/targetSelectionGraph';
import type { ReviewContext } from './ReviewContext';

const ReviewState = Annotation.Root({
  context: Annotation<ReviewContext>(),
  rules: Annotation<Rule[]>(),
  choice: Annotation<ProviderChoice | undefined>(),
  provider: Annotation<AgentProvider | undefined>(),
  targets: Annotation<Target[]>(),
  files: Annotation<string[]>(),
  reports: Annotation<RuleReport[]>(),
  summaryFile: Annotation<string | undefined>(),
});
type State = typeof ReviewState.State;

const decideConfiguration = async ({ context }: State) => ({ context: await chooseConfiguration(context) });

const configureProvider = async ({ context }: State) => ({ choice: await setupProvider(context) });

const hasProvider = ({ choice }: State) => choice !== undefined;

const chooseTarget = async ({ context }: State) => selectTarget(context);

const hasFilesToReview = ({ files }: State) => files.length > 0;

const grantAgentPermissions = async ({ context, choice, files }: State) => {
  const grant = await grantPermissions({ context, choice: choice!, files });
  const isSingleFileRun = files.length === 1;
  const showAgentActivity = isSingleFileRun || context.options.verbose;
  return { provider: choice!.createProvider({ grant, showAgentActivity }) };
};

const selectRules = async ({ context, rules }: State) => {
  const availableRules = rules.length ? rules : await loadRules({ context });
  const requestedRuleIds = context.options.rules;
  if (!requestedRuleIds?.length) return { rules: availableRules };

  const unknownRuleIds = requestedRuleIds.filter((id) => !availableRules.some((rule) => rule.id === id));
  if (unknownRuleIds.length) {
    throw new Error(
      `unknown rule(s): ${unknownRuleIds.join(', ')}. Available: ${availableRules.map(({ id }) => id).join(', ')}`,
    );
  }
  return { rules: availableRules.filter((rule) => requestedRuleIds.includes(rule.id)) };
};

const executeRules = async ({ context, rules, provider, files }: State) => ({
  reports: await runRules({ rules, context, provider: provider!, files }),
});

const summarize = ({ context, reports, targets }: State) => {
  const targetLabel = describeTargets(targets, context.workspaceRoot);
  const totals = context.run.usageTotals();
  process.stdout.write(`${renderTerminalSummary({ reports, totals })}\n\n`);
  const summaryFile = context.run.writeText(
    'summary.md',
    renderMarkdownSummary({ reports, target: targetLabel, totals }),
  );
  context.logger.info(
    `summary, prompts and events saved in ${path.relative(context.workspaceRoot, context.run.directory)}`,
  );
  return { summaryFile };
};

export const reviewPipeline = new StateGraph(ReviewState)
  .addNode('decideConfiguration', decideConfiguration)
  .addNode('configureProvider', configureProvider)
  .addNode('chooseTarget', chooseTarget)
  .addNode('grantAgentPermissions', grantAgentPermissions)
  .addNode('selectRules', selectRules)
  .addNode('executeRules', executeRules)
  .addNode('summarize', summarize)
  .addEdge(START, 'decideConfiguration')
  .addEdge('decideConfiguration', 'configureProvider')
  .addConditionalEdges('configureProvider', (state) => (hasProvider(state) ? 'chooseTarget' : END), [
    'chooseTarget',
    END,
  ])
  .addConditionalEdges('chooseTarget', (state) => (hasFilesToReview(state) ? 'grantAgentPermissions' : END), [
    'grantAgentPermissions',
    END,
  ])
  .addEdge('grantAgentPermissions', 'selectRules')
  .addEdge('selectRules', 'executeRules')
  .addEdge('executeRules', 'summarize')
  .addEdge('summarize', END)
  .compile({ name: 'review' });

export async function runReviewPipeline({ context, rules = [] }: { context: ReviewContext; rules?: Rule[] }) {
  return reviewPipeline.invoke({ context, rules, targets: [], files: [], reports: [] });
}
