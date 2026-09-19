// Public API. Everything a consumer's `settings.ts` or `rules/**/*.rule.ts` may import.
// Importing from here must be side-effect-free — it never starts the CLI.

export { defineSettings, type Settings, type SettingsInput } from './shared/settings';

export { createTestCoverageRule } from './rules/testCoverage/testCoverageRule';
export type { TestCoverageRuleOptions, TestPlacementParams } from './rules/testCoverage/testCoverageRule';
export { defaultGuidelines, DEFAULT_SCORED_CRITERIA, describeGuidelines } from './rules/testCoverage/testingGuidelines';
export type { Guideline } from './rules/testCoverage/testingGuidelines';
export type { AdditionalQualityCheck } from './rules/testCoverage/steps/reviewTestQualityLoop';
export type { SignalFlag } from './rules/testCoverage/steps/inspectTestFile';

export { createPromptRule } from './rules/promptRule/createPromptRule';
export {
  PromptRuleDefinitionSchema,
  parsePromptRuleDefinition,
  type PromptRuleDefinition,
  type PromptRuleInput,
  type PromptRuleReview,
} from './rules/promptRule/PromptRuleDefinition';

export type { FileOutcome, FileResult, Rule, RuleReport, RuleRunParams } from './segments/rules/Rule';

export { createRetryLoop } from './graph/createRetryLoop';
export type { RetryLoop, RetryLoopDefinition, RetryLoopOutcome } from './graph/createRetryLoop';
export { createSequentialLoop } from './graph/createSequentialLoop';
export type { SequentialLoop } from './graph/createSequentialLoop';
export { createConcurrentLoop } from './graph/createConcurrentLoop';
export type { ConcurrentLoop } from './graph/createConcurrentLoop';
export type { AttemptRecord, Evaluation } from './graph/attemptHistory';
export type { RetryAssessment, RetryCheck } from './graph/retryChecks';

export { analyzeStructured, StructuredOutputError } from './providers/analyzeStructured';
export type { AgentProvider, AgentUsage, EditOutcome } from './providers/AgentProvider';
export type { AgentSession, PermissionGrant, PermissionScope } from './providers/ProviderDefinition';

export {
  agentEditRetryChecks,
  canContinueSession,
  createAgentSession,
  describeEditProblems,
  describeUnsuccessfulLoop,
  runAgentEdit,
} from './segments/rules/agentEdit';
export type { AgentEditResult } from './segments/rules/agentEdit';
export { scoreInBatches } from './segments/rules/scoring';
export type { ScoringItem } from './segments/rules/scoring';
