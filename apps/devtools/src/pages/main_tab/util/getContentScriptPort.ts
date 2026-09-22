import { tryCatch } from 'easy-cancelable-promise/tryCatch';
import isNil from 'json-storage-formatter/isNil';
import isString from 'json-storage-formatter/isString';
import formatFromStore from 'json-storage-formatter/formatFromStore';
import messagesLogs$ from '../hooks/messagesLog';
import globalStates$, { ContentScriptMessage, isGlobalStateAction } from '../hooks/globalStates/globalStates';
import { createBudgetedQueue } from './createBudgetedQueue';
import { agentTracker, registerPageDispatcher } from '../agentBridge/agentBridge';
import { uniqueId } from 'react-global-state-hooks/uniqueId';
import { PAGE_CONNECTION_ATTEMPTS, pageConnection$ } from '../hooks/pageConnection';

/**
 * Panel side of the transport.
 *
 * The panel connects to the background service worker (not directly to the
 * content script) and announces which tab it is inspecting. The worker then
 * relays the inspected tab's monkey-patch messages to this port, and forwards
 * our devtools-request messages back to that tab's content script.
 */

let workerPort: chrome.runtime.Port | null = null;
let hasRequestedSnapshot = false;
let receivedPageMessage = false;

const SHOW_CONNECTING_AFTER_MS = 1000;
const SNAPSHOT_RETRY_MS = 1500;
const STALL_AFTER_MS = 6000;

const requestSnapshot = () => workerPort?.postMessage({ action: 'devtools-request/REQUEST_SNAPSHOT' });

const startWatchdog = () => {
  pageConnection$.actions.restart();

  setTimeout(() => {
    if (!receivedPageMessage) pageConnection$.actions.connecting();
  }, SHOW_CONNECTING_AFTER_MS);

  for (let attempt = 1; attempt < PAGE_CONNECTION_ATTEMPTS; attempt += 1) {
    setTimeout(() => {
      if (receivedPageMessage) return;

      pageConnection$.actions.attempted();
      requestSnapshot();
    }, attempt * SNAPSHOT_RETRY_MS);
  }

  setTimeout(() => {
    if (!receivedPageMessage) pageConnection$.actions.stalled();
  }, STALL_AFTER_MS);
};

export const retryConnection = () => {
  receivedPageMessage = false;
  startWatchdog();
  requestSnapshot();
};

export const reloadInspectedPage = () => {
  receivedPageMessage = false;
  startWatchdog();
  chrome.devtools.inspectedWindow.reload({});
};

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
  if (!receivedPageMessage && !isNil(message?.action)) {
    receivedPageMessage = true;
    pageConnection$.actions.synced();
  }

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

  if (!hasRequestedSnapshot) {
    hasRequestedSnapshot = true;
    requestSnapshot();
    startWatchdog();
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
