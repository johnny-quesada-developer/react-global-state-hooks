import fs from 'node:fs';
import path from 'node:path';
import { createPromptRule } from '../rules/promptRule/createPromptRule';
import { parsePromptRuleDefinition } from '../rules/promptRule/PromptRuleDefinition';
import type { Rule } from '../segments/rules/Rule';
import { loadConsumerModule } from './loadConsumerModule';
import { walkFiles } from './workspace';

const RULE_FILE = /\.rule\.(ts|js|mjs|cjs|json)$/;
const TS_OR_JS_RULE = /\.rule\.(ts|js|mjs|cjs)$/;
const JSON_RULE = /\.rule\.json$/;

const isRule = (value: unknown): value is Rule =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  'title' in value &&
  'description' in value &&
  typeof (value as Rule).run === 'function';

/**
 * Discovers `<rulesDirectory>/**\/*.rule.{ts,js,mjs,cjs,json}`, in deterministic order (sorted
 * by path relative to the rules directory). No index file and no manually maintained registry
 * are read — a rule is enabled purely by having a matching file present.
 */
export async function discoverRuleFiles(rulesDirectory: string): Promise<Rule[]> {
  if (!fs.existsSync(rulesDirectory)) return [];

  const ruleFiles = walkFiles(rulesDirectory)
    .filter((file) => RULE_FILE.test(file))
    .sort((left, right) => path.relative(rulesDirectory, left).localeCompare(path.relative(rulesDirectory, right)));

  const rules = await Promise.all(ruleFiles.map((file) => loadRuleFile(file)));
  assertNoDuplicateIds({ rules, ruleFiles });
  return rules;
}

async function loadRuleFile(file: string): Promise<Rule> {
  if (JSON_RULE.test(file)) {
    return createPromptRule(parsePromptRuleDefinition({ raw: JSON.parse(fs.readFileSync(file, 'utf8')), source: file }));
  }
  if (TS_OR_JS_RULE.test(file)) {
    const exported = await loadConsumerModule<unknown>(file);
    if (!isRule(exported)) {
      throw new Error(`${file} must default-export a Rule ({ id, title, description, run }); received ${describeExport(exported)}`);
    }
    return exported;
  }
  throw new Error(`${file} has an unsupported rule file extension`);
}

const describeExport = (value: unknown) => (value === undefined ? 'undefined (missing "export default")' : typeof value);

function assertNoDuplicateIds({ rules, ruleFiles }: { rules: Rule[]; ruleFiles: string[] }): void {
  const filesById = new Map<string, string[]>();
  rules.forEach((rule, index) => {
    filesById.set(rule.id, [...(filesById.get(rule.id) ?? []), ruleFiles[index]]);
  });
  const duplicates = [...filesById.entries()].filter(([, files]) => files.length > 1);
  if (duplicates.length) {
    const description = duplicates.map(([id, files]) => `"${id}" in ${files.join(' and ')}`).join('; ');
    throw new Error(`duplicate rule id(s): ${description}`);
  }
}
