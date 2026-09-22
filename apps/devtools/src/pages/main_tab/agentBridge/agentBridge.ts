import globalStates$ from '../hooks/globalStates/globalStates';
import {
  AGENT_CLOSE_SUPERSEDED,
  type CliToPanel,
  type PanelToCli,
} from 'react-hooks-global-states-debug/agent/protocol';
import { AgentTracker } from './agentTracker';
import { agentSettings$, agentStatus$ } from './agentSettings';

/**
 * Panel side of the agent channel.
 *
 * The `rgsh` CLI runs a WebSocket server on loopback and this panel dials it: an extension page
 * cannot listen. Chrome prints every refused loopback connection in the console and a page cannot
 * silence it, so the panel dials a couple of times and then goes idle: it dials again when the panel
 * regains focus or the user asks. When a CLI connects the panel answers its requests from the model
 * it already keeps; when it disconnects the subscription is dropped and agent work returns to zero.
 */

const DEFAULT_RETRY_MS = 2000;
const DEFAULT_MAX_FAILED_DIALS = 2;

let socket: WebSocket | null = null;

const send = (message: PanelToCli) => {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
};

type PageDispatcher = (action: string, payload: object) => void;

let dispatchToPage: PageDispatcher | null = null;

/** The transport to the page lives in getContentScriptPort, which imports this module: it registers itself. */
export const registerPageDispatcher = (dispatcher: PageDispatcher) => {
  dispatchToPage = dispatcher;
};

export const agentTracker = new AgentTracker(
  {
    getStores: () => globalStates$.getState().values(),
    getStore: (globalStateId) => globalStates$.getState().get(globalStateId as never),
  },
  send,
  {
    dispatch: (action, payload) => dispatchToPage?.(action, payload),
  },
);

/** Best effort: the page URL tells the CLI which app this panel is inspecting. */
const readInspectedPage = (callback: (page: string | null) => void) => {
  const inspectedWindow = typeof chrome === 'undefined' ? undefined : chrome.devtools?.inspectedWindow;
  if (!inspectedWindow) return callback(null);

  try {
    inspectedWindow.eval('location.href', (result: unknown) =>
      callback(typeof result === 'string' ? result : null),
    );
  } catch {
    callback(null);
  }
};

const isCliRequest = (value: unknown): value is CliToPanel =>
  typeof (value as { type?: unknown } | null)?.type === 'string';

let restart: (() => void) | null = null;

/** Dials again with the current settings, e.g. after a newer panel replaced this one or the bridge went idle. */
export const reconnectAgentBridge = () => restart?.();

/**
 * Keeps one connection attempt alive for the port in `agentSettings$`. Changing the port or the
 * enabled flag in the settings dialog closes the current socket and starts over.
 */
export const startAgentBridge = ({
  retryMs = DEFAULT_RETRY_MS,
  maxFailedDials = DEFAULT_MAX_FAILED_DIALS,
}: { retryMs?: number; maxFailedDials?: number } = {}) => {
  if (typeof WebSocket === 'undefined') return;

  // Bumped on every restart: callbacks of an older attempt see a different value and stop.
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  const stop = () => {
    attempt++;
    clearTimeout(retryTimer);
    const previous = socket;
    socket = null;
    agentTracker.stop();
    previous?.close();
  };

  let warned = false;

  const connect = (port: number, current: number, failedDials: number) => {
    const retry = () => {
      if (failedDials + 1 >= maxFailedDials) {
        agentStatus$.setState('idle');

        if (!warned) {
          warned = true;
          console.warn(
            `[agent] no rgsh listening on port ${port}. Chrome logs each refused connection, so the panel stopped dialing: it tries again when focused.`,
          );
        }

        return;
      }

      retryTimer = setTimeout(
        () => current === attempt && connect(port, current, failedDials + 1),
        retryMs,
      );
    };

    let opened = false;
    let ws: WebSocket;
    try {
      ws = new WebSocket(`ws://127.0.0.1:${port}`);
    } catch {
      return retry();
    }

    ws.onopen = () => {
      if (current !== attempt) return ws.close();

      socket = ws;
      opened = true;
      warned = false;
      agentStatus$.setState('connected');
      readInspectedPage((page) =>
        send({
          type: 'HELLO',
          version: 1,
          tabId:
            (typeof chrome === 'undefined' ? undefined : chrome.devtools?.inspectedWindow?.tabId) ?? null,
          page,
        }),
      );
    };

    ws.onmessage = (event) => {
      try {
        const request: unknown = JSON.parse(String(event.data));
        if (isCliRequest(request)) agentTracker.handleRequest(request);
      } catch (error) {
        console.error('[agent] bad request', error);
      }
    };

    ws.onclose = (event) => {
      if (current !== attempt) return;

      if (socket === ws) socket = null;
      agentTracker.stop();

      if (event.code === AGENT_CLOSE_SUPERSEDED) return agentStatus$.setState('replaced');

      agentStatus$.setState('waiting');

      if (!opened) return retry();

      retryTimer = setTimeout(() => current === attempt && connect(port, current, maxFailedDials - 1), retryMs);
    };
  };

  const dial = (failedDials: number) => {
    stop();

    const { enabled, port } = agentSettings$.getState();
    if (!enabled) return agentStatus$.setState('off');

    agentStatus$.setState('waiting');
    connect(port, attempt, failedDials);
  };

  restart = () => dial(0);

  const dialOnce = () => {
    if (agentStatus$.getState() === 'idle') dial(maxFailedDials - 1);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('focus', dialOnce);
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && dialOnce());
  }

  // Re-run on real changes only: the store notifies on every write, including equal values.
  let applied = '';
  agentSettings$.subscribe((settings) => {
    const key = `${settings.enabled}:${settings.port}`;
    if (key === applied) return;

    applied = key;
    restart?.();
  });
};
