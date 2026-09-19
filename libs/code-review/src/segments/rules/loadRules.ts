import path from 'node:path';
import type { ReviewContext } from '../../pipeline/ReviewContext';
import { discoverRuleFiles } from '../../shared/discoverRules';
import type { Rule } from './Rule';

/**
 * Loads exactly the rules the consumer's rules directory contains — nothing implicit is added.
 * An empty (or missing) rules directory means zero rules, not a hidden built-in default; the
 * `init` command is what writes a `coverage.rule.ts` (calling `createTestCoverageRule`) when the
 * consumer opts into coverage, at which point it's discovered like any other rule file.
 */
export async function loadRules({ context }: { context: ReviewContext }): Promise<Rule[]> {
  const rules = await discoverRuleFiles(context.rulesDirectory);
  if (rules.length) {
    context.logger.detail(`loaded ${rules.length} rule(s) from ${path.relative(context.workspaceRoot, context.rulesDirectory)}`);
  }
  return rules;
}
