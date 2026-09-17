import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ReviewContext } from '../../pipeline/ReviewContext';
import { createPromptRule } from '../../rules/promptRule/createPromptRule';
import { parsePromptRuleDefinition } from '../../rules/promptRule/PromptRuleDefinition';
import { resolveRulesDirectory } from '../../shared/projectConfig';
import { ruleRegistry } from './ruleRegistry';
import type { Rule } from './Rule';

const JSON_RULE = /\.rule\.json$/;
const TS_RULE = /\.rule\.[cm]?[jt]s$/;

const isRule = (value: unknown): value is Rule =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  'run' in value &&
  typeof (value as Rule).run === 'function';

export async function loadRulesFromDirectory(directory: string): Promise<Rule[]> {
  if (!fs.existsSync(directory)) return [];
  const entries = fs.readdirSync(directory).sort();

  const jsonRules = entries
    .filter((name) => JSON_RULE.test(name))
    .map((name) =>
      createPromptRule(
        parsePromptRuleDefinition({
          raw: JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8')),
          source: name,
        }),
      ),
    );

  const tsRules = await Promise.all(
    entries
      .filter((name) => TS_RULE.test(name))
      .map(async (name) => {
        const module = await import(pathToFileURL(path.join(directory, name)).href);
        const exported = module.default ?? module.rule;
        if (!isRule(exported)) throw new Error(`${name} must export a Rule as default export`);
        return exported;
      }),
  );

  return [...jsonRules, ...tsRules];
}

export async function loadRules({ context }: { context: ReviewContext }): Promise<Rule[]> {
  const directory = resolveRulesDirectory({
    workspaceRoot: context.workspaceRoot,
    config: context.projectConfig,
  });
  const customRules = await loadRulesFromDirectory(directory);
  const duplicates = customRules.filter((rule) => ruleRegistry.some((builtIn) => builtIn.id === rule.id));
  if (duplicates.length)
    throw new Error(
      `custom rule id(s) collide with built-in rules: ${duplicates.map(({ id }) => id).join(', ')}`,
    );

  if (customRules.length) {
    context.logger.detail(
      `loaded ${customRules.length} custom rule(s) from ${path.relative(context.workspaceRoot, directory)}`,
    );
  }
  return [...ruleRegistry, ...customRules];
}
