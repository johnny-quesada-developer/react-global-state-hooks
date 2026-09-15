import { useState, useCallback } from 'react';
import { uniqueId } from 'react-global-state-hooks/uniqueId';
import { isError } from '../../../shared/asserts';
import { wait } from '../../../shared/tools/promises';
import { getContentScriptPort } from '../util/getContentScriptPort';
import { ContentScriptMessage } from './globalStates';

export const useSendMessagesToContentScript = () => {
  const [messageError, setMessageError] = useState<string | null>(null);

  const sendMessageToContentScript = useCallback(
    async <T>(message: Omit<ContentScriptMessage<T>, 'id' | 'timestamp'>, retries = 0) => {
      try {
        const fullMessage = {
          ...message,
          id: uniqueId('devtools-request:'),
          timestamp: performance.now(),
        };

        const port = getContentScriptPort();

        port.postMessage({
          ...fullMessage,
          action: `devtools-request/${fullMessage.action}`,
        });
      } catch (error) {
        if (retries > 3) {
          setMessageError(isError(error) ? error.message : JSON.stringify(error));
          return;
        }

        await wait(120);

        // Retry with a tiny backoff to avoid tight recursion while the port is not ready.
        await sendMessageToContentScript(message, retries + 1);
      }
    },
    []
  );

  return { sendMessageToContentScript, messageError };
};
