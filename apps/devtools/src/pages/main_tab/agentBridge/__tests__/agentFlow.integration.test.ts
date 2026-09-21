import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:net';
import WsClient from 'ws';
import * as stateDiff from '@src/shared/agent/stateDiff';
import { run, EXIT, type Io } from 'react-hooks-global-states-debug/cli/run';
import { parseArgs } from 'react-hooks-global-states-debug/cli/args';
import type { Selection } from 'react-hooks-global-states-debug/cli/select';

/**
 * Real path, minus Chrome: the real debug patch instruments real stores and emits the real
 * messages; they enter the panel through the same port listener the service worker feeds, are
 * reduced by the real panel model, observed by the real tracker and sent over a real WebSocket to
 * the real CLI `run()`.
 */

const RETRY_MS = 20;

// A browser panel sends its extension origin on the handshake; Node clients need to say so.
class ExtensionWebSocket extends WsClient {
  constructor(url: string) {
    super(url, { origin: 'chrome-extension://test-extension' });
    // A browser socket reports failures through onclose; Node would throw on an unhandled 'error'.
    this.on('error', () => undefined);
  }
}

const getFreePort = () =>
  new Promise<number>((resolve) => {
    const probe = createServer();
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address() as { port: number };
      probe.close(() => resolve(port));
    });
  });

const until = async (condition: () => boolean, what: string, timeoutMs = 3000) => {
  const started = Date.now();
  while (!condition()) {
    if (Date.now() - started > timeoutMs) throw new Error(`Timed out waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};

let agentTracker: { isActive: boolean };
let stores: Record<string, any>;
let port: number;
let panelModel: any;
let agentSettings$: any;
let agentStatus$: any;
let makeStore: any;

type Session = { out: string[]; err: string[]; done: Promise<number>; stop: () => void };

// Every CLI a test starts is stopped afterwards, so one failure cannot leave a port taken.
const running: Session[] = [];

const startCli = (argv: string[], pick?: (list: any[]) => Promise<Selection>, cliPort = port): Session => {
  const out: string[] = [];
  const err: string[] = [];
  const controller = new AbortController();
  const io: Io = {
    out: (text) => void out.push(text),
    err: (text) => void err.push(text),
    interactive: Boolean(pick),
    pick: pick ?? (async () => null),
  };

  const done = run({ ...parseArgs(argv), port: cliPort }, io, controller.signal);
  const session = { out, err, done, stop: () => controller.abort() };
  running.push(session);
  return session;
};

const listening = (session: Session) => until(() => session.err.some((line) => line.startsWith('Listening')), 'subscription');
const stream = (session: Session) => session.out.join('');

beforeAll(async () => {
  const listeners: ((message: unknown) => void)[] = [];
  (globalThis as any).WebSocket = ExtensionWebSocket;
  (globalThis as any).chrome = {
    runtime: {
      connect: () => ({
        // What the service worker + content script do for a devtools request: hand it to the page.
        postMessage: (message: unknown) => {
          window.dispatchEvent(new MessageEvent('message', { data: message, source: window }));
        },
        onMessage: { addListener: (listener: (message: unknown) => void) => listeners.push(listener) },
        onDisconnect: { addListener: vi.fn() },
      }),
    },
    devtools: { inspectedWindow: { tabId: 7 } },
  };

  // The panel first, so its own stores are created BEFORE the patch and are never instrumented.
  ({ agentTracker } = await import('../agentBridge'));
  const { startAgentBridge } = await import('../agentBridge');
  ({ agentSettings$, agentStatus$ } = await import('../agentSettings'));
  panelModel = (await import('../../hooks/globalStates/globalStates')).default;
  await import('../../util/getContentScriptPort');
  panelModel.setMetadata((metadata: object) => ({ ...metadata, logMessages: false }));

  // The page: a fresh copy of the libraries with the debug patch installed first.
  vi.resetModules();
  (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    renderers: new Map(),
    listeners: { 'devtools-backend-installed': [], 'renderer-attached': [], fastRefreshScheduled: [], operations: [] },
  };

  // What the content script + service worker do: strip the prefix and hand the message to the panel port.
  vi.spyOn(window, 'postMessage').mockImplementation((message: any) => {
    const [, action] = String(message.action).split('/');
    for (const listener of listeners) listener({ ...message, action });
  });

  await import('react-hooks-global-states-debug');
  const { createGlobalState } = await import('react-hooks-global-states');
  makeStore = createGlobalState;

  const todos = createGlobalState(
    { todos: [{ id: 1, text: 'first', done: false }] },
    {
      name: 'todos',
      actions: {
        add(text: string) {
          return ({ setState }: any) => {
            setState((s: any) => ({ todos: [...s.todos, { id: s.todos.length + 1, text, done: false }] }));
            return { ok: true };
          };
        },
        boom() {
          return async () => {
            throw new Error('boom');
          };
        },
      },
    },
  );
  const counter = createGlobalState(0, { name: 'counter' });
  const cart = createGlobalState(
    { items: [] as string[], total: 0 },
    {
      actions: {
        addItem(name: string) {
          return ({ setState }: any) => {
            setState((s: any) => ({ items: [...s.items, name], total: s.total }));
            setState((s: any) => ({ ...s, total: s.items.length }));
          };
        },
      },
    },
  );
  const profile = createGlobalState(
    { user: { name: 'ada', age: 1 }, tags: ['a'], count: 1, handler: () => 'kept' },
    { name: 'profile', metadata: { source: 'test' } },
  );
  stores = { todos, counter, cart, profile };

  port = await getFreePort();
  // Started once: the bridge keeps redialing the port, so every CLI run below is picked up.
  agentSettings$.setState({ enabled: true, port });
  startAgentBridge({ retryMs: RETRY_MS });
});

afterAll(() => {
  vi.restoreAllMocks();
});

afterEach(async () => {
  for (const session of running.splice(0)) {
    session.stop();
    await session.done;
  }
  await until(() => !agentTracker.isActive, 'agent cleanup');
});

describe('agent runtime inspection, end to end', () => {
  it('connects, discovers named and unnamed stores, and lists them without subscribing', async () => {
    const session = startCli(['--list']);

    expect(await session.done).toBe(EXIT.ok);

    const output = stream(session);
    expect(output).toContain('todos');
    expect(output).toContain('actions: add, boom');
    expect(output).toContain('counter');
    expect(output).toMatch(/unnamed — .*agentFlow\.integration\.test\.ts:\d+/);
    expect(output).toContain('"items": []');
    expect(session.err.join('\n')).toContain('Connected to the DevTools panel');
    expect(agentTracker.isActive).toBe(false);
    expect(agentStatus$.getState()).toBe('connected');
  });

  it('streams one action with its input, state change, result and duration', async () => {
    const session = startCli(['--store', 'todos']);
    await listening(session);

    stores.todos.actions.add('Write the docs');
    await until(() => stream(session).includes('duration:'), 'the action event');

    const output = stream(session);
    expect(output).toMatch(/\[todos\] add\("Write the docs"\)/);
    expect(output).toContain('todos[1]: undefined → {"id":2,"text":"Write the docs","done":false}');
    expect(output).toContain('result: {"ok":true}');
    expect(output).toMatch(/duration: \d+ms/);

    session.stop();
    await session.done;
  });

  it('shows a direct setState as its own event, and only for targeted stores', async () => {
    const diff = vi.spyOn(stateDiff, 'diffState');
    const session = startCli(['--store', 'todos,counter']);
    await listening(session);

    stores.counter.setState(5);
    await until(() => stream(session).includes('[counter]'), 'the setState event');
    expect(stream(session)).toContain('(state): 0 → 5');

    // Positive control: the spy does see agent diffs for a targeted store.
    expect(diff).toHaveBeenCalled();

    // The unnamed store is not targeted: no output and no agent diff work for it.
    const callsBefore = diff.mock.calls.length;
    stores.cart.actions.addItem('shoe');
    expect(diff.mock.calls.length).toBe(callsBefore);
    expect(stream(session)).not.toContain('addItem');

    session.stop();
    await session.done;
    diff.mockRestore();
  });

  it('keeps every state step of an action, in order', async () => {
    const listed = startCli(['--list']);
    await listed.done;
    const location = /unnamed — (\S+)/.exec(stream(listed))![1];

    const targeted = startCli(['--store', location]);
    await listening(targeted);

    stores.cart.actions.addItem('shoe');
    await until(() => stream(targeted).includes('duration:'), 'the action event');

    const output = stream(targeted);
    expect(output).toContain(`[unnamed ${location}] addItem("shoe")`);
    expect(output).toContain('state (1/2):');
    // The previous test already added one shoe: the second one lands at index 1.
    expect(output).toContain('items[1]: undefined → "shoe"');
    expect(output).toContain('state (2/2):');
    expect(output).toContain('total: 1 → 2');

    targeted.stop();
    await targeted.done;
  });

  it('represents a failed async action as an error', async () => {
    const session = startCli(['--store', 'todos']);
    await listening(session);

    await expect(stores.todos.actions.boom()).rejects.toThrow('boom');
    await until(() => stream(session).includes('duration:'), 'the failed action event');

    const output = stream(session);
    expect(output).toContain('[todos] boom()');
    expect(output).toContain('error: Error: boom');
    expect(output).not.toContain('result:');

    session.stop();
    await session.done;
  });

  it('fails clearly on an unknown target, suggests candidates, and subscribes to nothing', async () => {
    const session = startCli(['--store', 'todo,counter']);

    expect(await session.done).toBe(EXIT.failed);
    expect(session.err.join('\n')).toContain('Store "todo" was not found. Available: todos');
    expect(agentTracker.isActive).toBe(false);
  });

  it('warns for "*" without stopping, and then streams every store', async () => {
    const session = startCli(['--store', '*']);
    await listening(session);

    expect(session.err.join('\n')).toContain('listens to every store');

    stores.counter.setState(6);
    stores.todos.actions.add('x');
    await until(() => stream(session).includes('[todos] add') && stream(session).includes('[counter]'), 'both stores');

    // Chronological, each block attributed to its own store.
    expect(stream(session).indexOf('[counter]')).toBeLessThan(stream(session).indexOf('[todos] add'));

    session.stop();
    await session.done;
  });

  it('picks stores interactively when a person is at the terminal', async () => {
    const seen: string[] = [];
    const session = startCli([], async (list) => {
      seen.push(...list.map((store) => store.name ?? 'unnamed'));
      return { selectors: [list.find((store) => store.name === 'counter').selector] };
    });
    await listening(session);

    expect(seen).toEqual(expect.arrayContaining(['todos', 'counter', 'unnamed']));
    session.stop();
    await session.done;
  });

  it('prints the list and asks for --store when there is no terminal', async () => {
    const session = startCli([]);

    expect(await session.done).toBe(EXIT.needsTarget);
    expect(stream(session)).toContain('todos');
    expect(session.err.join('\n')).toContain('Pass --store');
  });

  it('drops the subscription when the CLI disconnects, and agent work goes back to zero', async () => {
    const diff = vi.spyOn(stateDiff, 'diffState');
    const session = startCli(['--store', 'todos']);
    await listening(session);
    expect(agentTracker.isActive).toBe(true);

    session.stop();
    await session.done;
    await until(() => !agentTracker.isActive, 'unsubscribe');

    diff.mockClear();
    stores.todos.actions.add('after disconnect');
    stores.counter.setState(9);

    expect(diff).not.toHaveBeenCalled();
    // ...while the panel model itself kept working.
    const model = panelModel.getState();
    const counterMeta = model.values().find((meta: any) => meta.name === 'counter');
    expect(counterMeta.currentState).toBe(9);
    diff.mockRestore();
  });

  it('reports store lifecycle for subscribed stores', async () => {
    // Its own store: disposing one of the shared stores would break the tests after this one.
    const temporary = makeStore(1, { name: 'temporary' });
    const session = startCli(['--store', 'temporary']);
    await listening(session);

    temporary.dispose();
    await until(() => stream(session).includes('store removed'), 'the lifecycle event');
    expect(stream(session)).toMatch(/\[temporary\] store removed/);

    session.stop();
    await session.done;
  });

  it('follows the port set in the DevTools settings and reports its status', async () => {
    const otherPort = await getFreePort();
    agentSettings$.actions.setPort(otherPort);
    await until(() => agentStatus$.getState() === 'waiting', 'the bridge to leave the old port');

    const session = startCli(['--list'], undefined, otherPort);
    expect(await session.done).toBe(EXIT.ok);
    expect(agentStatus$.getState()).toMatch(/connected|waiting/);

    agentSettings$.actions.setPort(port);
  });

  it('ignores an invalid port', () => {
    agentSettings$.actions.setPort(80);
    agentSettings$.actions.setPort(70000);
    agentSettings$.actions.setPort(1.5);

    expect(agentSettings$.getState().port).toBe(port);
  });

  it('stops dialing while switched off, and connects again when switched on', async () => {
    agentSettings$.actions.setEnabled(false);
    await until(() => agentStatus$.getState() === 'off', 'the off status');

    const session = startCli(['--list']);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(session.err.join('\n')).not.toContain('Connected to the DevTools panel');

    agentSettings$.actions.setEnabled(true);
    expect(await session.done).toBe(EXIT.ok);
    expect(session.err.join('\n')).toContain('Connected to the DevTools panel');
  });

  describe('control: run actions and set state from the terminal', () => {
    afterEach(() => agentSettings$.actions.setAllowControl(false));

    it('is refused until the user allows it in DevTools', async () => {
      const session = startCli(['action', 'todos', 'add', 'nope']);

      expect(await session.done).toBe(EXIT.failed);
      expect(session.err.join('\n')).toContain('not allowed to change the app');
      expect(stores.todos.getState().todos.some((todo: any) => todo.text === 'nope')).toBe(false);
    });

    it('runs an action with its arguments and prints what it did', async () => {
      agentSettings$.actions.setAllowControl(true);
      const session = startCli(['action', 'todos', 'add', 'from the terminal']);

      expect(await session.done).toBe(EXIT.ok);

      const output = stream(session);
      expect(output).toContain('[todos] add("from the terminal")');
      expect(output).toMatch(/todos\[\d+\]: undefined → \{"id":\d+,"text":"from the terminal","done":false\}/);
      expect(output).toContain('result: {"ok":true}');
      expect(stores.todos.getState().todos.at(-1).text).toBe('from the terminal');
    });

    it('passes arguments as data: quotes and code in a value stay text', async () => {
      agentSettings$.actions.setAllowControl(true);
      // Text that would break out of a quoted argument if it were spliced into code.
      const hostile = 'x"); globalThis.__pwned = true; ("';
      const session = startCli(['action', 'todos', 'add', hostile]);

      expect(await session.done).toBe(EXIT.ok);
      expect((globalThis as any).__pwned).toBeUndefined();
      expect(stores.todos.getState().todos.at(-1).text).toBe(hostile);

      // The same value as explicit JSON, with an escaped quote and a backslash.
      const json = startCli(['action', 'todos', 'add', JSON.stringify('a"\\b')]);
      expect(await json.done).toBe(EXIT.ok);
      expect(stores.todos.getState().todos.at(-1).text).toBe('a"\\b');
    });

    it('sets a store state from JSON and prints the change', async () => {
      agentSettings$.actions.setAllowControl(true);
      const session = startCli(['set', 'counter', '42']);

      expect(await session.done).toBe(EXIT.ok);
      expect(stream(session)).toContain('[counter] setState');
      expect(stream(session)).toContain('(state): 9 → 42');
      expect(stores.counter.getState()).toBe(42);
    });

    it('reports a thrown error and exits non-zero', async () => {
      agentSettings$.actions.setAllowControl(true);
      const session = startCli(['action', 'todos', 'boom']);

      expect(await session.done).toBe(EXIT.failed);
      expect(stream(session)).toContain('error: Error: boom');
    });

    it('rejects an unknown action or store with what is available', async () => {
      agentSettings$.actions.setAllowControl(true);

      const action = startCli(['action', 'todos', 'nothing']);
      expect(await action.done).toBe(EXIT.failed);
      expect(action.err.join('\n')).toContain('has no action "nothing". Available: add, boom');

      const store = startCli(['set', 'countr', '1']);
      expect(await store.done).toBe(EXIT.failed);
      expect(store.err.join('\n')).toContain('Store "countr" was not found. Available: counter');
    });
  });

  describe('reading state and metadata', () => {
    it('prints the state, and the metadata with its caveat, without needing control', async () => {
      const session = startCli(['state', 'profile']);

      expect(await session.done).toBe(EXIT.ok);
      const output = stream(session);
      expect(output).toContain('[profile] state:');
      expect(output).toContain('"name": "ada"');
      expect(output).toContain('"__non_serializable__": "function"');
      expect(output).toContain('metadata (as announced when the store was created');
      expect(output).toContain('"source": "test"');
    });

    it('reads one path, and fails clearly when nothing is there', async () => {
      const found = startCli(['state', 'profile', 'user.name']);
      expect(await found.done).toBe(EXIT.ok);
      expect(stream(found)).toContain('[profile] state at user.name:\n"ada"');

      const missing = startCli(['state', 'profile', 'user.nope']);
      expect(await missing.done).toBe(EXIT.failed);
      expect(missing.err.join('\n')).toContain('Nothing at "user.nope" in [profile]');
    });
  });

  describe('patch', () => {
    afterEach(() => agentSettings$.actions.setAllowControl(false));

    it('is refused until control is allowed', async () => {
      const session = startCli(['patch', 'profile', '{"count":5}']);

      expect(await session.done).toBe(EXIT.failed);
      expect(session.err.join('\n')).toContain('not allowed to change the app');
      expect(stores.profile.getState().count).toBe(1);
    });

    it('merges an object into the state and leaves everything else alone, functions included', async () => {
      agentSettings$.actions.setAllowControl(true);
      const session = startCli(['patch', 'profile', '{"user":{"age":2}}']);

      expect(await session.done).toBe(EXIT.ok);
      expect(stream(session)).toContain('user.age: 1 → 2');
      expect(stream(session)).not.toContain('user.name');

      const state = stores.profile.getState();
      expect(state.user).toEqual({ name: 'ada', age: 2 });
      expect(state.count).toBe(1);
      expect(state.handler()).toBe('kept');
    });

    it('replaces primitives and arrays', async () => {
      agentSettings$.actions.setAllowControl(true);

      const primitive = startCli(['patch', 'counter', '7']);
      expect(await primitive.done).toBe(EXIT.ok);
      expect(stores.counter.getState()).toBe(7);

      const array = startCli(['patch', 'profile', '{"tags":["z"]}']);
      expect(await array.done).toBe(EXIT.ok);
      expect(stores.profile.getState().tags).toEqual(['z']);
    });
  });
});
