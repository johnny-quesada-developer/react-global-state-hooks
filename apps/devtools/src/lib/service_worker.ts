/**
 * Background service worker (MV3).
 *
 * Under Manifest V3 a devtools panel and a content script cannot reliably hold a
 * direct port between them: the content script connects at document_start (before
 * the panel exists) and there is no persistent page to keep the connection alive.
 *
 * This worker is the broker. Both ends connect to it and it relays messages by
 * tab id:
 *
 *   content_script  ──(port "content-script", sender.tab.id known)──▶  worker
 *   devtools panel  ──(port "devtools-panel", announces its tabId)──▶  worker
 *
 * Messages from the content script (monkey-patch events) are forwarded to the
 * devtools panel inspecting the same tab, and devtools-request messages from the
 * panel are forwarded back to that tab's content script.
 *
 * The worker keeps no message history. When the panel first opens it asks the page
 * for a fresh snapshot (the panel sends devtools-request/REQUEST_SNAPSHOT once); the
 * page holds the source of truth. This avoids buffering data nobody may ever read.
 */

type Ports = {
  contentScript: chrome.runtime.Port | null;
  devtools: chrome.runtime.Port | null;
};

// One entry per inspected tab.
const portsByTabId = new Map<number, Ports>();

const getEntry = (tabId: number): Ports => {
  let entry = portsByTabId.get(tabId);
  if (!entry) {
    entry = { contentScript: null, devtools: null };
    portsByTabId.set(tabId, entry);
  }
  return entry;
};

const cleanupEntry = (tabId: number) => {
  const entry = portsByTabId.get(tabId);
  if (!entry) return;
  if (!entry.contentScript && !entry.devtools) {
    portsByTabId.delete(tabId);
  }
};

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'content-script') {
    const tabId = port.sender?.tab?.id;
    if (typeof tabId !== 'number') return;

    const entry = getEntry(tabId);
    entry.contentScript = port;

    port.onMessage.addListener((message) => {
      // Forward monkey-patch events to the panel inspecting this tab.
      entry.devtools?.postMessage(message);
    });

    port.onDisconnect.addListener(() => {
      if (entry.contentScript === port) entry.contentScript = null;
      cleanupEntry(tabId);
    });

    return;
  }

  if (port.name === 'devtools-panel') {
    // The devtools page cannot rely on sender.tab; it announces the inspected
    // tab id in its first message: { action: 'init', tabId }.
    let boundTabId: number | null = null;

    port.onMessage.addListener((message: { action?: string; tabId?: number }) => {
      if (message?.action === 'init' && typeof message.tabId === 'number') {
        boundTabId = message.tabId;
        const entry = getEntry(boundTabId);
        entry.devtools = port;
        return;
      }

      // Any other message from the panel (devtools-request/...) is forwarded to
      // the content script of the bound tab.
      if (boundTabId === null) return;
      const entry = portsByTabId.get(boundTabId);
      entry?.contentScript?.postMessage(message);
    });

    port.onDisconnect.addListener(() => {
      if (boundTabId === null) return;
      const entry = portsByTabId.get(boundTabId);
      if (entry && entry.devtools === port) entry.devtools = null;
      cleanupEntry(boundTabId);
    });

    return;
  }
});
