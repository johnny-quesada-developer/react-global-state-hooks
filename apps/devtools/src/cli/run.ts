import { ALL_STORES, type AgentEvent, type AgentStoreInfo, type AgentStoreRef, type PanelToCli } from '../shared/agent/protocol';
import { type CliOptions, type ControlCommand } from './args';
import { formatEvent, formatState, formatStoreList, formatStoreRef } from './format';
import { resolveTargets } from './resolve';
import type { Selection } from './select';
import { PanelSession, startServer } from './server';

export type Io = {
  out: (text: string) => void;
  err: (text: string) => void;
  /** True when a person can drive the picker (a TTY on stdin and stdout). */
  interactive: boolean;
  pick: (stores: AgentStoreInfo[]) => Promise<Selection>;
};

export const EXIT = { ok: 0, failed: 1, needsTarget: 2, noOutcome: 3 } as const;

const ALL_WARNING =
  'warning: --store "*" listens to every store. DevTools does extra processing for every state change and ' +
  'this stream gets much larger. Naming the stores you need (--store todos,auth) is more efficient.';

const RESUBSCRIBE_ATTEMPTS = 5;
const RESUBSCRIBE_DELAY_MS = 1000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const describePanel = ({ tabId, page }: Extract<PanelToCli, { type: 'HELLO' }>) =>
  [tabId !== null ? `tab ${tabId}` : null, page].filter(Boolean).join(' ');

/**
 * The whole CLI flow, with the terminal and the abort signal injected so it can be driven from tests.
 * Resolves with the process exit code once the stream ends or the run is aborted.
 */
export const run = async (options: CliOptions, io: Io, signal: AbortSignal): Promise<number> => {
  let server;
  try {
    server = await startServer(options.port);
  } catch (error) {
    const { code } = error as { code?: string };
    io.err(
      code === 'EADDRINUSE'
        ? `Port ${options.port} is already in use. Is another rgsh running? Stop it or pass --port.`
        : `Could not start the listener on port ${options.port}: ${(error as Error).message}`,
    );
    return EXIT.failed;
  }

  return new Promise<number>((resolve) => {
    let current: PanelSession | null = null;
    let subscribed: string[] | typeof ALL_STORES | null = null;
    let finished = false;
    let commandStarted = false;

    const finish = async (code: number) => {
      if (finished) return;
      finished = true;
      await server.close();
      resolve(code);
    };

    signal.addEventListener('abort', () => void finish(EXIT.ok), { once: true });

    const subscribe = async (panel: PanelSession, selectors: string[] | typeof ALL_STORES) => {
      const reply = await panel.request({ type: 'SUBSCRIBE', selectors }, ['SUBSCRIBED', 'REJECTED']);
      if (reply.type === 'REJECTED') return reply;

      subscribed = selectors;
      const names = reply.matched.length ? reply.matched.map(formatStoreRef).join(' ') : '(no store yet)';
      io.err(`Listening to ${reply.all ? 'all stores' : names}. Press Ctrl+C to stop.`);
      return null;
    };

    /**
     * `state` reads and prints. `action`, `set` and `patch`: watch the store, hand the request to DevTools, then print the event that
     * reports what the page did and stop. Watching first means the outcome cannot be missed.
     */
    const runCommand = async (panel: PanelSession, command: ControlCommand) => {
      const { stores } = await panel.request({ type: 'GET_STORES' }, ['AVAILABLE_STORES']);
      const resolved = resolveTargets([command.store], stores);

      if (resolved.unknown.length) {
        const [{ target, candidates }] = resolved.unknown;
        io.err(`Store "${target}" was not found. Available: ${candidates.join(', ') || '(none)'}`);
        return finish(EXIT.failed);
      }

      const [selector] = resolved.selectors;
      if (resolved.selectors.length !== 1) {
        io.err(`"${command.store}" matches ${resolved.selectors.length} stores. Name exactly one.`);
        return finish(EXIT.failed);
      }

      if (command.kind === 'state') {
        const reply = await panel.request({ type: 'GET_STATE', selector, path: command.path }, ['STATE', 'REQUEST_REJECTED']);
        if (reply.type === 'REQUEST_REJECTED') {
          io.err(reply.reason);
          return finish(EXIT.failed);
        }

        if (!reply.found) {
          io.err(`Nothing at "${reply.path}" in ${formatStoreRef(reply.store)}.`);
          return finish(EXIT.failed);
        }

        io.out(`${formatState(reply)}\n`);
        return finish(EXIT.ok);
      }

      const watch = await panel.request({ type: 'SUBSCRIBE', selectors: [selector] }, ['SUBSCRIBED', 'REJECTED']);
      if (watch.type === 'REJECTED') {
        io.err(`${watch.reason}: ${watch.unknown.join(', ')}`);
        return finish(EXIT.failed);
      }

      // Known before anything is sent: the outcome can arrive ahead of the DISPATCHED reply.
      const isWatched = ({ label, instance }: AgentStoreRef) =>
        watch.matched.some((store) => store.label === label && store.instance === instance);
      const expectedAction = command.kind === 'action' ? command.action : 'setState';
      const seen: AgentEvent[] = [];

      const outcome = new Promise<AgentEvent | null>((done) => {
        const timer = setTimeout(() => done(null), options.timeoutSeconds * 1000);
        panel.onEvent((event) => {
          seen.push(event);
          if (event.kind !== 'action' || event.action !== expectedAction || !isWatched(event.store)) return;

          clearTimeout(timer);
          done(event);
        });
      });

      const request = (() => {
        if (command.kind === 'set') return { type: 'SET_STATE', selector, state: command.state } as const;
        if (command.kind === 'patch') return { type: 'PATCH_STATE', selector, patch: command.patch } as const;
        return { type: 'RUN_ACTION', selector, action: command.action, args: command.args } as const;
      })();

      const reply = await panel.request(request, ['DISPATCHED', 'REQUEST_REJECTED']);
      if (reply.type === 'REQUEST_REJECTED') {
        io.err(reply.reason);
        return finish(EXIT.failed);
      }

      const event = await outcome;

      // Anything else the store reported while waiting is part of the story: print it in order.
      for (const other of seen) if (other !== event) io.out(`${formatEvent(other)}\n\n`);

      if (!event) {
        io.err(
          `Sent, but the page reported nothing within ${options.timeoutSeconds}s. The action may still be running, ` +
            'or the store is not live on the page.',
        );
        return finish(EXIT.noOutcome);
      }

      io.out(`${formatEvent(event)}\n`);
      return finish(event.kind === 'action' && event.result && 'error' in event.result ? EXIT.failed : EXIT.ok);
    };

    /** First panel: discover, choose targets, subscribe. */
    const start = async (panel: PanelSession) => {
      const { stores } = await panel.request({ type: 'GET_STORES' }, ['AVAILABLE_STORES']);

      if (options.list) {
        io.out(`${formatStoreList(stores)}\n`);
        return finish(EXIT.ok);
      }

      let selectors: string[] | typeof ALL_STORES;

      if (options.targets.length) {
        if (options.targets.includes(ALL_STORES)) {
          io.err(ALL_WARNING);
          selectors = ALL_STORES;
        } else {
          const resolved = resolveTargets(options.targets, stores);
          if (resolved.unknown.length) {
            for (const { target, candidates } of resolved.unknown) {
              io.err(`Store "${target}" was not found. Available: ${candidates.join(', ') || '(none)'}`);
            }
            return finish(EXIT.failed);
          }
          selectors = resolved.selectors;
        }
      } else if (io.interactive && stores.length) {
        const picked = await io.pick(stores);
        if (!picked) return finish(EXIT.ok);

        if ('all' in picked) {
          io.err(ALL_WARNING);
          selectors = ALL_STORES;
        } else {
          selectors = picked.selectors;
        }
      } else {
        io.out(`${formatStoreList(stores)}\n`);
        io.err('\nPass --store <names> (or --store "*") to stream one or more of these stores.');
        return finish(EXIT.needsTarget);
      }

      const rejected = await subscribe(panel, selectors);
      if (rejected) {
        io.err(`${rejected.reason}: ${rejected.unknown.join(', ')}`);
        return finish(EXIT.failed);
      }
    };

    /** A panel that reconnects (DevTools reopened): restore the subscription once it knows its stores. */
    const restore = async (panel: PanelSession, selectors: string[] | typeof ALL_STORES) => {
      for (let attempt = 1; attempt <= RESUBSCRIBE_ATTEMPTS; attempt++) {
        if (current !== panel) return;
        if (!(await subscribe(panel, selectors))) return;
        await wait(RESUBSCRIBE_DELAY_MS);
      }

      io.err('Could not restore the subscription: the stores are not known by DevTools any more.');
      return finish(EXIT.failed);
    };

    server.onPanel((panel) => {
      const isFirst = subscribed === null;
      current = panel;

      io.err(`Connected to the DevTools panel${describePanel(panel.hello) ? ` (${describePanel(panel.hello)})` : ''}.`);

      if (!options.command) panel.onEvent((event) => io.out(`${formatEvent(event)}\n\n`));
      panel.onClose(() => {
        if (current !== panel || finished) return;
        current = null;
        io.err('DevTools panel disconnected. Waiting for it to reconnect...');
      });

      // A command must run once: a panel that reconnects afterwards must not repeat it.
      if (options.command) {
        if (commandStarted) return;
        commandStarted = true;
      }

      const flow = options.command
        ? runCommand(panel, options.command)
        : isFirst
          ? start(panel)
          : restore(panel, subscribed!);
      flow.catch((error: Error) => {
        io.err(error.message);
        return finish(EXIT.failed);
      });
    });

    io.err(
      `Waiting for the DevTools panel on port ${options.port}. Open DevTools on the app tab and ` +
        'select the react-global-state-hooks panel.',
    );
  });
};
