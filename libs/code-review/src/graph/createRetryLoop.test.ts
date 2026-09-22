import { describeHistory, type AttemptRecord } from './attemptHistory';
import { createRetryLoop } from './createRetryLoop';
import { createSequentialLoop } from './createSequentialLoop';
import { stopWhenNothingChangesTwice, stopWhenScoresStagnate } from './retryChecks';
import { stopWhenProviderUnavailable } from '../providers/agentFailure';
import { silentLogger } from '../shared/logger';

describe('createRetryLoop', () => {
  it('retries with the accumulated history until the evaluation passes, and stops at the max attempts otherwise', async () => {
    const historySeenByAttempt: AttemptRecord[][] = [];
    const passingOnThirdAttempt = createRetryLoop<{ target: number }, number>({
      name: 'reach target',
      maxAttempts: 4,
      attempt: async ({ attemptNumber, history }) => {
        historySeenByAttempt.push(history);
        return attemptNumber * 10;
      },
      evaluate: async ({ context, result }) => ({
        passed: result! >= context.target,
        feedback: `got ${result}`,
        scores: { value: result! },
      }),
    });

    const passing = await passingOnThirdAttempt.run({ context: { target: 30 }, logger: silentLogger() });

    expect(passing.passed).toBe(true);
    expect(passing.attemptsUsed).toBe(3);
    expect(passing.lastResult).toBe(30);
    expect(passing.history.map(({ attempt, passed }) => [attempt, passed])).toEqual([
      [1, false],
      [2, false],
      [3, true],
    ]);
    expect(historySeenByAttempt.map((history) => history.length)).toEqual([0, 1, 2]);
    expect(describeHistory(historySeenByAttempt[2])).toContain('Attempt 2 → failed\n  feedback: got 20');

    const exhausted = await passingOnThirdAttempt.run({ context: { target: 999 }, logger: silentLogger() });

    expect(exhausted.passed).toBe(false);
    expect(exhausted.attemptsUsed).toBe(4);
    expect(exhausted.lastEvaluation?.feedback).toBe('got 40');
  });

  it('turns crashing attempts into failed feedback and can start with an evaluation that skips every attempt', async () => {
    let attemptCalls = 0;
    const crashingLoop = createRetryLoop<null, string>({
      name: 'crashing',
      maxAttempts: 2,
      attempt: async () => {
        attemptCalls += 1;
        throw new Error('provider unavailable');
      },
      evaluate: async () => ({ passed: true, feedback: 'never reached' }),
    });

    const crashed = await crashingLoop.run({ context: null, logger: silentLogger() });

    expect(crashed.passed).toBe(false);
    expect(attemptCalls).toBe(2);
    expect(crashed.history.map(({ feedback }) => feedback)).toEqual([
      'attempt crashed: provider unavailable',
      'attempt crashed: provider unavailable',
    ]);

    const alreadyGood = createRetryLoop<null, string>({
      name: 'evaluation first',
      maxAttempts: 3,
      startWith: 'evaluation',
      attempt: async () => {
        throw new Error('attempt must not run when the first evaluation passes');
      },
      evaluate: async ({ attemptNumber }) => ({ passed: true, feedback: `evaluated at ${attemptNumber}` }),
    });

    const outcome = await alreadyGood.run({ context: null, logger: silentLogger() });

    expect(outcome).toMatchObject({ passed: true, attemptsUsed: 0 });
    expect(outcome.history).toEqual([{ attempt: 0, passed: true, feedback: 'evaluated at 0' }]);
  });
});

describe('retry assessment', () => {
  const runLoop = async ({
    evaluations,
    retryChecks,
  }: {
    evaluations: { feedback: string; changedFiles?: string[]; scores?: Record<string, number> }[];
    retryChecks?: Parameters<typeof createRetryLoop<null, number>>[0]['retryChecks'];
  }) => {
    let attempts = 0;
    const loop = createRetryLoop<null, number>({
      name: 'assessed',
      maxAttempts: 10,
      retryChecks,
      attempt: async () => ++attempts,
      evaluate: async ({ attemptNumber }) => ({
        passed: false,
        ...evaluations[Math.min(attemptNumber, evaluations.length) - 1],
      }),
    });
    const outcome = await loop.run({ context: null, logger: silentLogger() });
    return { attempts, stopReason: outcome.stopReason };
  };

  it('keeps retrying while failures still change and stops as soon as another attempt cannot change the outcome', async () => {
    const progressing = await runLoop({
      evaluations: Array.from({ length: 10 }, (_, index) => ({
        feedback: `lines ${index * 5}%`,
        changedFiles: ['a.test.ts'],
      })),
    });
    expect(progressing).toEqual({ attempts: 10, stopReason: undefined });

    const repeatedWithoutChanges = await runLoop({
      evaluations: [{ feedback: 'lines 10%' }, { feedback: 'lines 10%' }],
    });
    expect(repeatedWithoutChanges).toEqual({
      attempts: 2,
      stopReason: 'the exact same failure repeated without any file change',
    });

    const providerDown = await runLoop({
      retryChecks: [stopWhenProviderUnavailable],
      evaluations: [{ feedback: 'lines 0% · agent exited with code 1: Error: rate limit reached for haiku' }],
    });
    expect(providerDown.attempts).toBe(1);
    expect(providerDown.stopReason).toContain('provider is unavailable');

    const testOutputMentioningEnoent = await runLoop({
      retryChecks: [stopWhenProviderUnavailable],
      evaluations: [
        { feedback: 'related tests are failing: ENOENT fixture.json', changedFiles: ['a.test.ts'] },
        { feedback: 'lines 90%', changedFiles: ['a.test.ts'] },
      ],
    });
    expect(testOutputMentioningEnoent.stopReason).toBeUndefined();

    const idleAgent = await runLoop({
      retryChecks: [stopWhenNothingChangesTwice],
      evaluations: [
        { feedback: 'first', changedFiles: [] },
        { feedback: 'second', changedFiles: [] },
      ],
    });
    expect(idleAgent).toEqual({
      attempts: 2,
      stopReason: 'the agent did not change any file in the last two attempts',
    });

    const stagnantScores = await runLoop({
      retryChecks: [stopWhenScoresStagnate],
      evaluations: [
        { feedback: 'a', changedFiles: ['x'], scores: { lines: 70 } },
        { feedback: 'b', changedFiles: ['y'], scores: { lines: 72 } },
        { feedback: 'c', changedFiles: ['z'], scores: { lines: 72 } },
      ],
    });
    expect(stagnantScores.attempts).toBe(3);
    expect(stagnantScores.stopReason).toBe('no measurable progress in the last two attempts ({"lines":72})');
  });
});

describe('createSequentialLoop', () => {
  it('processes items one at a time in order and handles empty input', async () => {
    const events: string[] = [];
    const loop = createSequentialLoop<string, string>({
      name: 'uppercase',
      processItem: async (item, { index, total }) => {
        events.push(`start ${item}`);
        await new Promise((resolve) => setTimeout(resolve, 5));
        events.push(`end ${item}`);
        return `${index + 1}/${total} ${item.toUpperCase()}`;
      },
    });

    expect(await loop.run(['a', 'b', 'c'])).toEqual(['1/3 A', '2/3 B', '3/3 C']);
    expect(events).toEqual(['start a', 'end a', 'start b', 'end b', 'start c', 'end c']);
    expect(await loop.run([])).toEqual([]);
  });
});
