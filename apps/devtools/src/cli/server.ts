import type { AddressInfo } from 'node:net';
import { WebSocketServer, type WebSocket } from 'ws';
import {
  AGENT_CLOSE_SUPERSEDED,
  type AgentEvent,
  type CliToPanel,
  type PanelToCli,
} from '../shared/agent/protocol';

type Hello = Extract<PanelToCli, { type: 'HELLO' }>;
type Reply<T extends PanelToCli['type']> = Extract<PanelToCli, { type: T }>;

const REQUEST_TIMEOUT_MS = 10_000;

/** One connected DevTools panel. */
export class PanelSession {
  private replyWaiters = new Set<(message: PanelToCli) => void>();
  private eventListeners: ((event: AgentEvent) => void)[] = [];
  private closeListeners: (() => void)[] = [];

  constructor(
    private readonly socket: WebSocket,
    public readonly hello: Hello,
  ) {
    socket.on('message', (data) => this.receive(data.toString()));
    socket.on('close', () => {
      for (const listener of this.closeListeners) listener();
    });
  }

  private receive(text: string) {
    let message: PanelToCli;
    try {
      message = JSON.parse(text);
    } catch {
      return;
    }

    if (message.type === 'EVENT') {
      for (const listener of this.eventListeners) listener(message.event);
      return;
    }

    for (const waiter of [...this.replyWaiters]) waiter(message);
  }

  public onEvent(listener: (event: AgentEvent) => void) {
    this.eventListeners.push(listener);
  }

  public onClose(listener: () => void) {
    this.closeListeners.push(listener);
  }

  public send(message: CliToPanel) {
    this.socket.send(JSON.stringify(message));
  }

  /** Sends a request and resolves with the first reply of one of the expected types. */
  public request<T extends PanelToCli['type']>(message: CliToPanel, expected: T[]): Promise<Reply<T>> {
    return new Promise((resolve, reject) => {
      const finish = () => {
        clearTimeout(timer);
        this.replyWaiters.delete(waiter);
        this.closeListeners = this.closeListeners.filter((listener) => listener !== onClose);
      };

      const waiter = (reply: PanelToCli) => {
        if (!expected.includes(reply.type as T)) return;
        finish();
        resolve(reply as Reply<T>);
      };
      const onClose = () => {
        finish();
        reject(new Error('DevTools panel disconnected'));
      };
      const timer = setTimeout(() => {
        finish();
        reject(new Error(`DevTools did not answer ${message.type} in ${REQUEST_TIMEOUT_MS / 1000}s`));
      }, REQUEST_TIMEOUT_MS);

      this.replyWaiters.add(waiter);
      this.closeListeners.push(onClose);
      this.send(message);
    });
  }
}

export type AgentServer = {
  /** The bound port (useful when 0 asked for any free one). */
  port: number;
  /** Called for every panel that connects. The newest panel replaces the previous one. */
  onPanel: (listener: (panel: PanelSession) => void) => void;
  close: () => Promise<void>;
};

/** Browsers always send an Origin on WebSocket handshakes: only the extension may connect. */
const isAllowedOrigin = (origin: string | undefined) => origin === undefined || origin.startsWith('chrome-extension://');

export const startServer = (port: number): Promise<AgentServer> =>
  new Promise((resolve, reject) => {
    const panelListeners: ((panel: PanelSession) => void)[] = [];
    let current: WebSocket | null = null;

    const wss = new WebSocketServer({
      host: '127.0.0.1',
      port,
      verifyClient: ({ origin }: { origin?: string }) => isAllowedOrigin(origin),
    });

    wss.once('error', reject);

    wss.on('connection', (socket) => {
      // The HELLO comes first; until then nothing is exposed.
      socket.once('message', (data) => {
        let hello: PanelToCli;
        try {
          hello = JSON.parse(data.toString());
        } catch {
          return socket.close();
        }
        if (hello.type !== 'HELLO') return socket.close();

        current?.close(AGENT_CLOSE_SUPERSEDED, 'a newer DevTools panel connected');
        current = socket;
        socket.on('close', () => {
          if (current === socket) current = null;
        });

        const panel = new PanelSession(socket, hello);
        for (const listener of panelListeners) listener(panel);
      });
    });

    wss.once('listening', () => {
      wss.off('error', reject);
      // An address error after startup must not crash the stream.
      wss.on('error', () => undefined);

      resolve({
        port: (wss.address() as AddressInfo).port,
        onPanel: (listener) => panelListeners.push(listener),
        close: () =>
          new Promise<void>((done) => {
            for (const client of wss.clients) client.close();
            wss.close(() => done());
          }),
      });
    });
  });
