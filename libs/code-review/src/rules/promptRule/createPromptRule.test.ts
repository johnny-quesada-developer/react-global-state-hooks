import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ReviewContext } from '../../pipeline/ReviewContext';
import { createFakeProvider } from '../../providers/fakeProvider';
import { loadRulesFromDirectory } from '../../segments/rules/loadRules';
import { scriptedAsk } from '../../shared/ask';
import { silentLogger } from '../../shared/logger';
import { defaultProjectConfig } from '../../shared/projectConfig';
import { createRunArtifacts } from '../../shared/runArtifacts';
import { createRuleWizard } from '../../wizard/createRuleWizard';
import { createPromptRule } from './createPromptRule';
import { parsePromptRuleDefinition } from './PromptRuleDefinition';

const temporaryDirectories: string[] = [];

afterEach(() => {
  temporaryDirectories
    .splice(0)
    .forEach((directory) => fs.rmSync(directory, { recursive: true, force: true }));
});

function createWorkspace(files: Record<string, string>) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'review-prompt-rule-')));
  temporaryDirectories.push(root);
  Object.entries(files).forEach(([file, content]) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  });
  execFileSync('git', ['init', '-q'], { cwd: root });
  fs.writeFileSync(path.join(root, '.gitignore'), '.review\n');
  const context: ReviewContext = {
    workspaceRoot: root,
    invocationDirectory: root,
    options: { targets: [], acceptDefaults: true, verbose: false },
    projectConfig: defaultProjectConfig(),
    ask: scriptedAsk(),
    logger: silentLogger(),
    run: createRunArtifacts({ workspaceRoot: root }),
  };
  return {
    root,
    context,
    at: (file: string) => path.join(root, file),
    read: (file: string) => fs.readFileSync(path.join(root, file), 'utf8'),
  };
}

const noConsoleRule = parsePromptRuleDefinition({
  source: 'test',
  raw: {
    id: 'no-console',
    title: 'No console output',
    description: 'Production modules must not log to the console.',
    scope: { include: ['src/**/*.ts'] },
    criteria: [{ id: 'silence', title: 'Silence', description: 'No console calls.' }],
    blockingFlags: [{ flag: 'usesConsole', description: 'calls console.*' }],
    maxAttempts: 2,
  },
});

const scoreByContent = (content: string) => {
  const usesConsole = content.includes('console.');
  return {
    scores: { silence: usesConsole ? 2 : 10 },
    flags: usesConsole ? ['usesConsole'] : [],
    evidence: [],
    suggestedFixes: ['remove console'],
  };
};

describe('createPromptRule', () => {
  it('scores files in scope, lets the agent fix violations until they pass and leaves a TODO when they do not', async () => {
    const workspace = createWorkspace({
      'src/clean.ts': 'export const clean = 1;\n',
      'src/noisy.ts': "export const noisy = () => console.log('hi');\n",
      'src/stubborn.ts': "export const stubborn = () => console.warn('no');\n",
      'src/ignored.test.ts': "console.log('tests may log');\n",
      'docs/notes.md': 'console.log',
    });
    const scoreCalls: string[] = [];
    const provider = createFakeProvider({
      analyzeResponders: {
        'score-no-console': ({ prompt, file: batchFile }) => {
          const file = batchFile ?? prompt.match(/--- file: (.+) ---/)![1];
          scoreCalls.push(file);
          return scoreByContent(workspace.read(file));
        },
      },
      editResponder: ({ prompt }) => {
        const isNoisy = prompt.includes('src/noisy.ts');
        if (isNoisy)
          fs.writeFileSync(workspace.at('src/noisy.ts'), 'export const noisy = () => undefined;\n');
      },
    });

    const report = await createPromptRule(noConsoleRule).run({
      context: workspace.context,
      provider,
      files: ['src/clean.ts', 'src/noisy.ts', 'src/stubborn.ts', 'src/ignored.test.ts', 'docs/notes.md'].map(
        workspace.at,
      ),
      logger: workspace.context.logger,
    });

    const byFile = Object.fromEntries(report.fileResults.map((result) => [result.file, result]));
    expect(byFile['src/clean.ts']).toMatchObject({
      status: 'compliant',
      outcome: 'passed',
      details: { minScore: 10, tries: 0 },
    });
    expect(byFile['src/noisy.ts']).toMatchObject({
      status: 'fixed',
      outcome: 'passed',
      details: { tries: 1 },
    });
    expect(byFile['src/stubborn.ts']).toMatchObject({
      status: 'fixFailed',
      outcome: 'failed',
      details: { minScore: 2, flags: 'usesConsole' },
    });
    expect(byFile['src/stubborn.ts'].reason).toContain(
      'stopped early after 1 attempt(s) because the exact same failure repeated without any file change',
    );
    expect(byFile['src/ignored.test.ts']).toMatchObject({ status: 'outOfScope', outcome: 'skipped' });
    expect(byFile['docs/notes.md']).toMatchObject({ status: 'outOfScope' });

    expect(workspace.read('src/stubborn.ts')).toMatch(
      /^\/\/ \[TODO\] code-review\(no-console\): stopped early/,
    );
    expect(workspace.read('src/noisy.ts')).not.toContain('[TODO]');
    expect(scoreCalls.filter((file) => file === 'src/clean.ts')).toHaveLength(1);
    expect(scoreCalls.filter((file) => file === 'src/noisy.ts')).toHaveLength(2);
  });

  it('creates a rule through the wizard: drafts the rubric with the fast model, proves it on a sample file and saves JSON', async () => {
    const workspace = createWorkspace({
      'review.config.json': JSON.stringify({ rulesDirectory: 'rules' }),
      'src/sample.ts': 'export const sample = 1;\n',
    });
    workspace.context.projectConfig = { ...defaultProjectConfig(), rulesDirectory: 'rules' };
    workspace.context.options = { targets: [], acceptDefaults: true, verbose: false, provider: 'fake' };
    workspace.context.ask = scriptedAsk({
      'Rule id': 'clear-code',
      'Describe what the rule checks': 'Code must be readable without comments.',
    });

    const file = await createRuleWizard(workspace.context);

    expect(path.relative(workspace.root, file)).toBe('rules/clear-code.rule.json');
    const saved = JSON.parse(workspace.read('rules/clear-code.rule.json'));
    expect(saved).toMatchObject({
      id: 'clear-code',
      title: 'clear code',
      description: 'Code must be readable without comments.',
      scope: { include: ['**/*.{ts,tsx}'] },
      canFix: true,
      maxAttempts: 2,
      passThreshold: 7,
      blockingFlags: [{ flag: 'containsDebugCode' }],
    });
    expect(saved.criteria.map(({ id }: { id: string }) => id)).toEqual(['clarity', 'naming']);
    expect((await loadRulesFromDirectory(workspace.at('rules'))).map(({ id }) => id)).toEqual(['clear-code']);
  });

  it('loads JSON and TS rule files from a directory and rejects invalid definitions', async () => {
    const workspace = createWorkspace({
      'rules/no-console.rule.json': JSON.stringify({ ...noConsoleRule, id: 'no-console' }),
      'rules/from-ts.rule.ts': `export default { id: 'from-ts', title: 'TS rule', description: 'x', run: async () => ({ ruleId: 'from-ts', title: 'TS rule', fileResults: [], notes: [], changedOutsideTargets: [] }) };\n`,
      'rules/README.md': 'not a rule',
    });

    const rules = await loadRulesFromDirectory(workspace.at('rules'));
    expect(rules.map(({ id }) => id)).toEqual(['no-console', 'from-ts']);

    fs.writeFileSync(workspace.at('rules/broken.rule.json'), JSON.stringify({ id: 'Bad Id', criteria: [] }));
    await expect(loadRulesFromDirectory(workspace.at('rules'))).rejects.toThrow(
      /invalid rule definition in broken.rule.json → id: rule ids are kebab-case/,
    );
  });
});
