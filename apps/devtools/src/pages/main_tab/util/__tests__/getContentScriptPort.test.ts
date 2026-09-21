import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type FakePort = {
  postMessage: ReturnType<typeof vi.fn>;
  onMessage: { addListener: ReturnType<typeof vi.fn> };
  onDisconnect: { addListener: ReturnType<typeof vi.fn> };
};

const globals = globalThis as unknown as { chrome: unknown };

const snapshotRequests = (port: FakePort) =>
  port.postMessage.mock.calls.filter(([message]) => message?.action === 'devtools-request/REQUEST_SNAPSHOT').length;

const load = async () => {
  const port: FakePort = {
    postMessage: vi.fn(),
    onMessage: { addListener: vi.fn() },
    onDisconnect: { addListener: vi.fn() },
  };
  const reload = vi.fn();
  globals.chrome = {
    runtime: { connect: vi.fn(() => port) },
    devtools: { inspectedWindow: { tabId: 7, reload } },
  };

  vi.resetModules();
  const transport = await import('../getContentScriptPort');
  const { pageConnection$ } = await import('../../hooks/pageConnection');

  return { port, reload, transport, pageConnection$ };
};

describe('panel transport watchdog', () => {
  const originalChrome = globals.chrome;

  beforeEach(() => vi.useFakeTimers());

  afterEach(() => {
    vi.useRealTimers();
    globals.chrome = originalChrome;
  });

  it('stays quiet for the first second, then shows the connecting state while it retries', async () => {
    const { port, pageConnection$ } = await load();

    expect(port.postMessage).toHaveBeenCalledWith({ action: 'init', tabId: 7 });
    expect(snapshotRequests(port)).toBe(1);

    await vi.advanceTimersByTimeAsync(900);
    expect(pageConnection$.getState()).toEqual({ status: 'waiting', attempt: 1 });

    await vi.advanceTimersByTimeAsync(100);
    expect(pageConnection$.getState().status).toBe('connecting');

    await vi.advanceTimersByTimeAsync(3500);
    expect(snapshotRequests(port)).toBe(4);
    expect(pageConnection$.getState()).toEqual({ status: 'connecting', attempt: 4 });

    await vi.advanceTimersByTimeAsync(1500);
    expect(pageConnection$.getState().status).toBe('stalled');
  });

  it('never shows anything when the page answers within the first second', async () => {
    const { port, pageConnection$ } = await load();
    const [onPageMessage] = port.onMessage.addListener.mock.calls[0];
    const statuses: string[] = [];
    pageConnection$.subscribe((state) => statuses.push(state.status));

    await vi.advanceTimersByTimeAsync(300);
    onPageMessage({ action: 'CLEAR_GLOBAL_STATES', payload: { globalStatePath: '*' } });
    await vi.advanceTimersByTimeAsync(10_000);

    expect(statuses).toEqual(['waiting', 'synced']);
    expect(snapshotRequests(port)).toBe(1);
  });

  it('stops retrying and hides the overlay once the page answers late', async () => {
    const { port, pageConnection$ } = await load();
    const [onPageMessage] = port.onMessage.addListener.mock.calls[0];

    await vi.advanceTimersByTimeAsync(2000);
    expect(pageConnection$.getState().status).toBe('connecting');

    onPageMessage({ action: 'CLEAR_GLOBAL_STATES', payload: { globalStatePath: '*' } });
    await vi.advanceTimersByTimeAsync(10_000);

    expect(pageConnection$.getState().status).toBe('synced');
    expect(snapshotRequests(port)).toBe(2);
  });

  it('reloadInspectedPage reloads the tab and starts the whole sequence again', async () => {
    const { reload, transport, pageConnection$ } = await load();
    await vi.advanceTimersByTimeAsync(6000);
    expect(pageConnection$.getState().status).toBe('stalled');

    transport.reloadInspectedPage();

    expect(reload).toHaveBeenCalledTimes(1);
    expect(pageConnection$.getState()).toEqual({ status: 'waiting', attempt: 1 });

    await vi.advanceTimersByTimeAsync(1000);
    expect(pageConnection$.getState().status).toBe('connecting');
  });

  it('retryConnection asks the page again without reloading it', async () => {
    const { port, reload, transport, pageConnection$ } = await load();
    await vi.advanceTimersByTimeAsync(6000);
    const requestsBefore = snapshotRequests(port);

    transport.retryConnection();

    expect(snapshotRequests(port)).toBe(requestsBefore + 1);
    expect(reload).not.toHaveBeenCalled();
    expect(pageConnection$.getState()).toEqual({ status: 'waiting', attempt: 1 });
  });
});
