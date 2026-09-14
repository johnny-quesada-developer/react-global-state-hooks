import isString from 'json-storage-formatter/isString';
import type { MessageToContentScript } from '../monkey_patch/dev-tools';
import { isNonNullable } from '../shared/asserts/asserts';
import isNil from 'json-storage-formatter/isNil';
import { tryCatch } from 'easy-cancelable-promise/tryCatch';
import { isMonkeyPatchActionJson } from '../shared/schema/MonkeyPatchActionJson';
import { wait } from '../shared/tools/promises';

type DevtoolsResponseMessage = {
  id: string;
  success?: boolean;
  error?: unknown;
  action: 'devtools-request' | 'devtools-response';
};

(() => {
  if (Object.hasOwnProperty.call(globalThis, 'REACT_GLOBAL_STATE_HOOK_DEBUG')) return;

  const pendingMessages: (Omit<MessageToContentScript, 'action'> & { action: string })[] = [];

  let communicationPort: chrome.runtime.Port | null = null;
  let reconnectDelay = 500;
  const maxReconnectDelay = 5000;

  const flushPendingMessages = () => {
    if (!communicationPort || !pendingMessages.length) return;

    const port = communicationPort;
    const { error } = tryCatch(() => {
      for (const message of pendingMessages) {
        port.postMessage(message);
      }
    });

    if (error) return;

    pendingMessages.length = 0;
  };

  const connect = () => {
    const { result: port } = tryCatch(() => {
      const created = chrome.runtime.connect({ name: 'content-script' });
      const lastError = chrome.runtime.lastError;
      if (isNonNullable(lastError)) throw lastError;
      return created;
    });

    if (isNil(port)) {
      scheduleReconnect();
      return;
    }

    communicationPort = port;
    reconnectDelay = 500;

    port.onMessage.addListener((message: DevtoolsResponseMessage) => {
      if (isNil(message?.action)) return;

      if (message.action.includes('devtools-request')) {
        window.postMessage(message);
      }
    });

    port.onDisconnect.addListener(() => {
      communicationPort = null;
      scheduleReconnect();
    });

    flushPendingMessages();
  };

  const scheduleReconnect = async () => {
    const delay = reconnectDelay;
    reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay);
    await wait(delay);
    if (communicationPort) return;
    connect();
  };

  const addMonkeyPatchMessagesListener = () => {
    window.addEventListener('message', (event: MessageEvent<MessageToContentScript>) => {
      const { result } = tryCatch(() => {
        if (event.source !== window) return;
        if (!isString(event?.data?.action)) return;

        const [origin, action] = event.data.action.split('/');
        if (!origin.includes('monkey-patch')) return;
        if (!isMonkeyPatchActionJson(action)) return;

        pendingMessages.push({ ...event.data, action });
        flushPendingMessages();
      });

      void result;
    });
  };

  connect();
  addMonkeyPatchMessagesListener();
})();
