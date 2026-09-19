import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ReviewContext } from '../../pipeline/ReviewContext';
import { scriptedAsk } from '../../shared/ask';
import { describeLocalState, loadLocalState, rememberChoices } from '../../shared/reviewConfig';
import { createTestContext } from '../../testSupport/createTestContext';
import { applySavedConfiguration, chooseConfiguration } from './chooseConfiguration';

const temporaryDirectories: string[] = [];

afterEach(() => {
  temporaryDirectories
    .splice(0)
    .forEach((directory) => fs.rmSync(directory, { recursive: true, force: true }));
});

const createContext = (
  answers: Record<string, unknown> = {},
  options: Partial<ReviewContext['options']> = {},
): ReviewContext => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'review-config-'));
  temporaryDirectories.push(workspaceRoot);
  return createTestContext({ workspaceRoot, answers, options: { acceptDefaults: false, ...options } });
};

describe('configuration reuse', () => {
  it('merges decisions across segments, offers them back on the next run and lets flags win', async () => {
    const context = createContext({ 'How do you want to configure this run?': 'reuse' }, { goal: 95 });
    expect(await chooseConfiguration(context)).toBe(context);

    rememberChoices({
      workspaceRoot: context.workspaceRoot,
      patch: { provider: 'claude', models: { fast: 'haiku', capable: 'sonnet' } },
    });
    rememberChoices({
      workspaceRoot: context.workspaceRoot,
      patch: { permissions: 'workspace', concurrency: 2 },
    });
    rememberChoices({
      workspaceRoot: context.workspaceRoot,
      patch: { coverage: { goal: 80, maxCoverageAttempts: 3, maxQualityAttempts: 2, testSuffix: 'test' } },
    });

    const saved = loadLocalState(context.workspaceRoot)!;
    expect(describeLocalState(saved)).toBe(
      'claude · sonnet for edits · haiku for scoring · workspace edit permissions · coverage goal 80% · 3/2 attempts · .test files · concurrency 2',
    );

    const reused = await chooseConfiguration(context);
    expect(reused.options).toMatchObject({
      provider: 'claude',
      model: 'sonnet',
      fastModel: 'haiku',
      permissions: 'workspace',
      concurrency: 2,
      goal: 95,
      maxCoverageAttempts: 3,
      maxQualityAttempts: 2,
      testSuffix: 'test',
      reusedConfiguration: true,
    });

    const stepByStep = await chooseConfiguration({
      ...context,
      ask: scriptedAsk({ 'How do you want to configure this run?': 'stepByStep' }),
    });
    expect(stepByStep.options.provider).toBeUndefined();
    expect(stepByStep.options.reusedConfiguration).toBeUndefined();

    const forcedFresh = await chooseConfiguration({
      ...context,
      options: { ...context.options, configuration: 'stepByStep' },
    });
    expect(forcedFresh.options.provider).toBeUndefined();

    expect(applySavedConfiguration({ options: { ...context.options, model: 'opus' }, saved }).model).toBe(
      'opus',
    );
  });
});
