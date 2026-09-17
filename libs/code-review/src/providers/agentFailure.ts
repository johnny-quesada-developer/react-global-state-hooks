import type { RetryCheck } from '../graph/retryChecks';

const PROVIDER_UNAVAILABLE =
  /not logged in|please run .*login|invalid api key|authentication (failed|error)|unauthorized|rate limit|usage limit|quota exceeded|credit balance|model .*(not found|not available|does not exist)|is not a valid json schema|unknown option|command not found|ENOENT/i;

export const describesUnavailableProvider = (text: string) => PROVIDER_UNAVAILABLE.test(text);

const AGENT_FAILURE_SEGMENT = /(attempt crashed:|agent exited with code \d+:)[\s\S]*/;

export const stopWhenProviderUnavailable: RetryCheck<unknown> = ({ evaluation }) =>
  describesUnavailableProvider(evaluation.feedback.match(AGENT_FAILURE_SEGMENT)?.[0] ?? '')
    ? {
        isWorthRetrying: false,
        reason: 'the AI provider is unavailable or misconfigured (auth, limits, model or CLI options)',
      }
    : undefined;
