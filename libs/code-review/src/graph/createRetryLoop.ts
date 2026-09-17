import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import type { Logger } from '../shared/logger';
import type { AttemptRecord, Evaluation } from './attemptHistory';
import { assessRetry, stopWhenFailureRepeats, type RetryAssessment, type RetryCheck } from './retryChecks';

export interface RetryLoopDefinition<TContext, TResult> {
  name: string;
  maxAttempts: number;
  startWith?: 'attempt' | 'evaluation';
  attempt: (params: {
    context: TContext;
    history: AttemptRecord[];
    attemptNumber: number;
  }) => Promise<TResult>;
  evaluate: (params: {
    context: TContext;
    result: TResult | undefined;
    attemptNumber: number;
  }) => Promise<Evaluation>;
  retryChecks?: RetryCheck<TResult>[];
}

export interface RetryLoopOutcome<TResult> {
  passed: boolean;
  attemptsUsed: number;
  history: AttemptRecord[];
  lastResult?: TResult;
  lastEvaluation?: Evaluation;
  stopReason?: string;
}

export interface RetryLoop<TContext, TResult> {
  run: (params: { context: TContext; logger: Logger }) => Promise<RetryLoopOutcome<TResult>>;
}

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function createRetryLoop<TContext, TResult>({
  name,
  maxAttempts,
  startWith = 'attempt',
  attempt,
  evaluate,
  retryChecks = [],
}: RetryLoopDefinition<TContext, TResult>): RetryLoop<TContext, TResult> {
  const LoopState = Annotation.Root({
    context: Annotation<TContext>(),
    logger: Annotation<Logger>(),
    attemptNumber: Annotation<number>(),
    attemptError: Annotation<string | undefined>(),
    lastResult: Annotation<TResult | undefined>(),
    lastEvaluation: Annotation<Evaluation | undefined>(),
    lastAssessment: Annotation<RetryAssessment | undefined>(),
    stopReason: Annotation<string | undefined>(),
    history: Annotation<AttemptRecord[]>({
      reducer: (current, next) => current.concat(next),
      default: () => [],
    }),
  });
  type State = typeof LoopState.State;

  const runAttempt = async (state: State) => {
    const attemptNumber = state.attemptNumber + 1;
    state.logger.step(`${name} ${attemptNumber}/${maxAttempts}`);
    try {
      const result = await attempt({ context: state.context, history: state.history, attemptNumber });
      return { attemptNumber, lastResult: result, attemptError: undefined };
    } catch (error) {
      return { attemptNumber, attemptError: errorMessage(error) };
    }
  };

  const runEvaluation = async (state: State) => {
    const evaluation = await evaluateSafely(state);
    const record: AttemptRecord = { attempt: state.attemptNumber, ...evaluation };
    const verdict = evaluation.passed ? 'passed' : 'failed';
    const log = evaluation.passed ? state.logger.success : state.logger.warn;
    log(`${name} ${state.attemptNumber}/${maxAttempts} ${verdict}: ${evaluation.feedback}`);
    return { lastEvaluation: evaluation, history: [record] };
  };

  const evaluateSafely = async (state: State): Promise<Evaluation> => {
    if (state.attemptError) return { passed: false, feedback: `attempt crashed: ${state.attemptError}` };
    try {
      return await evaluate({
        context: state.context,
        result: state.lastResult,
        attemptNumber: state.attemptNumber,
      });
    } catch (error) {
      return { passed: false, feedback: `evaluation crashed: ${errorMessage(error)}` };
    }
  };

  const assessFailure = (state: State) => {
    const assessment = assessRetry({
      checks: [stopWhenFailureRepeats, ...retryChecks],
      result: state.lastResult,
      evaluation: state.lastEvaluation!,
      history: state.history,
    });
    const verdict = assessment.isWorthRetrying ? 'worth retrying' : 'not worth retrying';
    state.logger.detail(`${name} ${verdict}: ${assessment.reason}`);
    return {
      lastAssessment: assessment,
      stopReason: assessment.isWorthRetrying ? undefined : assessment.reason,
    };
  };

  const decideAfterEvaluation = (state: State) => {
    const hasPassed = state.lastEvaluation?.passed === true;
    const hasAttemptsLeft = state.attemptNumber < maxAttempts;
    if (hasPassed) return END;
    if (hasAttemptsLeft) return 'assessFailure';
    state.logger.error(`${name} exhausted ${maxAttempts} attempts`);
    return END;
  };

  const decideAfterAssessment = (state: State) => {
    if (state.lastAssessment?.isWorthRetrying) return 'attempt';
    state.logger.error(`${name} stopped early: ${state.lastAssessment?.reason}`);
    return END;
  };

  const graph = new StateGraph(LoopState)
    .addNode('attempt', runAttempt)
    .addNode('evaluate', runEvaluation)
    .addEdge(START, startWith === 'attempt' ? 'attempt' : 'evaluate')
    .addNode('assessFailure', assessFailure)
    .addEdge('attempt', 'evaluate')
    .addConditionalEdges('evaluate', decideAfterEvaluation, ['assessFailure', END])
    .addConditionalEdges('assessFailure', decideAfterAssessment, ['attempt', END])
    .compile({ name });

  return {
    async run({ context, logger }) {
      const finalState = await graph.invoke(
        { context, logger, attemptNumber: 0 },
        { recursionLimit: maxAttempts * 3 + 10 },
      );
      return {
        passed: finalState.lastEvaluation?.passed === true,
        attemptsUsed: finalState.attemptNumber,
        history: finalState.history,
        lastResult: finalState.lastResult,
        lastEvaluation: finalState.lastEvaluation,
        stopReason: finalState.stopReason,
      };
    },
  };
}
