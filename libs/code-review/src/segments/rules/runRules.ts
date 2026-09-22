import { createSequentialLoop } from '../../graph/createSequentialLoop';
import type { Rule, RuleReport, RuleRunParams } from './Rule';

export async function runRules({
  rules,
  context,
  provider,
  files,
}: Omit<RuleRunParams, 'logger'> & { rules: Rule[] }): Promise<RuleReport[]> {
  const rulesLoop = createSequentialLoop<Rule, RuleReport>({
    name: 'rules',
    processItem: async (rule, { index, total }) => {
      const logger = context.logger.child(rule.id);
      logger.step(`rule ${index + 1}/${total}: ${rule.title}`);
      try {
        return await rule.run({ context, provider, files, logger });
      } catch (error) {
        const crashReason = error instanceof Error ? error.message : String(error);
        logger.error(`rule crashed: ${crashReason}`);
        return {
          ruleId: rule.id,
          title: rule.title,
          fileResults: [],
          notes: [],
          changedOutsideTargets: [],
          crashReason,
        };
      }
    },
  });

  return rulesLoop.run(rules);
}
