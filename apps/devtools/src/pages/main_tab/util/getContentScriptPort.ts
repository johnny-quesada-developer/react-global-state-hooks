import { tryCatch } from 'easy-cancelable-promise/tryCatch';
import isNil from 'json-storage-formatter/isNil';
import isString from 'json-storage-formatter/isString';
import formatFromStore from 'json-storage-formatter/formatFromStore';
import messagesLogs$ from '../hooks/messagesLog';
import globalStates$, { ContentScriptMessage, isGlobalStateAction } from '../hooks/globalStates/globalStates';
import { createBudgetedQueue } from './createBudgetedQueue';
import { agentTracker, registerPageDispatcher } from '../agentBridge/agentBridge';
import { uniqueId } from 'react-global-state-hooks/uniqueId';

/**
 * Panel side of the transport.
 *
 * The panel connects to the background service worker (not directly to the
 * content script) and announces which tab it is inspecting. The worker then
 * relays the inspected tab's monkey-patch messages to this port, and forwards
 * our devtools-request messages back to that tab's content script.
 */

let workerPort: chrome.runtime.Port | null = null;

// The page starts emitting init messages before the panel exists, so the first
// messages are missed and the panel opens empty. We ask the page for a one-time
// snapshot of its live stores. This runs only once: a transport reconnect keeps the
// same store ids and a page reload re-announces itself, so neither needs a re-request.
let hasRequestedSnapshot = false;

// Time-budgeted so a flood of messages (e.g. a tight setState loop) can't starve the main thread.
const messageQueue = createBudgetedQueue(function processMessage(rawMessage: ContentScriptMessage<any>) {
  // if there is no action, ignore the message
  if (isNil(rawMessage?.action)) return;

  const action = rawMessage.action;
  if (!isGlobalStateAction(action)) return;

  const message: ContentScriptMessage<any> = isString(rawMessage.payload)
    ? { ...rawMessage, payload: formatFromStore(rawMessage.payload) }
    : rawMessage;

  if (globalStates$.getMetadata().logMessages) {
    console.log(action, message.payload);
  }

  const { error } = tryCatch(() =>
    agentTracker.observe(action, message, () => globalStates$.actions[action](message)),
  );

  if (error) {
    console.error(`[error] ${action}`, error);

    if (globalStates$.getMetadata().logMessages) {
      messagesLogs$.actions.push({
        ...message,
        action: `[error] ${action}`,
      });
    }

    return;
  }

  messagesLogs$.actions.push(message);
});

const handleIncomingMessage = (message: ContentScriptMessage<any>) => {
  messageQueue.push(message);
};

const connectToWorker = () => {
  const { result: port } = tryCatch(() => chrome.runtime.connect({ name: 'devtools-panel' }));
  if (isNil(port)) {
    setTimeout(connectToWorker, 1000);
    return;
  }

  workerPort = port;

  // Tell the worker which tab we are inspecting so it can route messages.
  port.postMessage({ action: 'init', tabId: chrome.devtools.inspectedWindow.tabId });

  // Ask the page once for its current stores, covering the case where the panel
  // opened after the page had already emitted its initialization messages.
  if (!hasRequestedSnapshot) {
    hasRequestedSnapshot = true;
    port.postMessage({ action: 'devtools-request/REQUEST_SNAPSHOT' });
  }

  port.onMessage.addListener(handleIncomingMessage);

  port.onDisconnect.addListener(() => {
    workerPort = null;
    // The worker may have been torn down (MV3). Reconnect so we keep receiving.
    setTimeout(connectToWorker, 1000);
  });
};

connectToWorker();

export const getContentScriptPort = () => {
  return workerPort!;
};

// Same message shape as useSendMessagesToContentScript, for requests that come from a terminal.
registerPageDispatcher((action, payload) => {
  workerPort?.postMessage({
    id: uniqueId('devtools-request:'),
    timestamp: performance.now(),
    action: `devtools-request/${action}`,
    payload,
  });
});
