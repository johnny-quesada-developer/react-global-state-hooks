import path from 'node:path';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import type { AgentProvider } from '../providers/AgentProvider';
import { setupProvider } from '../segments/providerSetup/providerSetupGraph';
import type { Rule, RuleReport } from '../segments/rules/Rule';
import { ruleRegistry } from '../segments/rules/ruleRegistry';
import { runRules } from '../segments/rules/runRules';
import { renderMarkdownSummary, renderTerminalSummary } from '../segments/summary/renderSummary';
import { describeTarget, type Target } from '../segments/targetSelection/detectTarget';
import { selectTarget } from '../segments/targetSelection/targetSelectionGraph';
import type { ReviewContext } from './ReviewContext';

const ReviewState = Annotation.Root({
  context: Annotation<ReviewContext>(),
  rules: Annotation<Rule[]>(),
  provider: Annotation<AgentProvider | undefined>(),
  target: Annotation<Target | undefined>(),
  files: Annotation<string[]>(),
  reports: Annotation<RuleReport[]>(),
  summaryFile: Annotation<string | undefined>(),
});
type State = typeof ReviewState.State;

const configureProvider = async ({ context }: State) => ({ provider: await setupProvider(context) });

const hasProvider = ({ provider }: State) => provider !== undefined;

const chooseTarget = async ({ context }: State) => selectTarget(context);

const hasFilesToReview = ({ files }: State) => files.length > 0;

const selectRules = ({ context, rules }: State) => {
  const requestedRuleIds = context.options.rules;
  if (!requestedRuleIds?.length) return { rules };

  const unknownRuleIds = requestedRuleIds.filter((id) => !rules.some((rule) => rule.id === id));
  if (unknownRuleIds.length)
    throw new Error(
      `unknown rule(s): ${unknownRuleIds.join(', ')}. Available: ${rules.map(({ id }) => id).join(', ')}`,
    );
  return { rules: rules.filter((rule) => requestedRuleIds.includes(rule.id)) };
};

const executeRules = async ({ context, rules, provider, files }: State) => ({
  reports: await runRules({ rules, context, provider: provider!, files }),
});

const summarize = ({ context, reports, target }: State) => {
  const targetLabel = describeTarget(target!, context.workspaceRoot);
  process.stdout.write(`${renderTerminalSummary(reports)}\n\n`);
  const summaryFile = context.run.writeText(
    'summary.md',
    renderMarkdownSummary({ reports, target: targetLabel }),
  );
  context.logger.info(
    `summary, prompts and events saved in ${path.relative(context.workspaceRoot, context.run.directory)}`,
  );
  return { summaryFile };
};

export const reviewPipeline = new StateGraph(ReviewState)
  .addNode('configureProvider', configureProvider)
  .addNode('chooseTarget', chooseTarget)
  .addNode('selectRules', selectRules)
  .addNode('executeRules', executeRules)
  .addNode('summarize', summarize)
  .addEdge(START, 'configureProvider')
  .addConditionalEdges('configureProvider', (state) => (hasProvider(state) ? 'chooseTarget' : END), [
    'chooseTarget',
    END,
  ])
  .addConditionalEdges('chooseTarget', (state) => (hasFilesToReview(state) ? 'selectRules' : END), [
    'selectRules',
    END,
  ])
  .addEdge('selectRules', 'executeRules')
  .addEdge('executeRules', 'summarize')
  .addEdge('summarize', END)
  .compile({ name: 'review' });

export async function runReviewPipeline({
  context,
  rules = ruleRegistry,
}: {
  context: ReviewContext;
  rules?: Rule[];
}) {
  return reviewPipeline.invoke({ context, rules, files: [], reports: [] });
}
