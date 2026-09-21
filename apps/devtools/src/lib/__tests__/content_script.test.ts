import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type ChromeStub = { runtime: { id?: string; connect: ReturnType<typeof vi.fn> } };

const globals = globalThis as unknown as { chrome: ChromeStub | undefined; REACT_GLOBAL_STATE_HOOK_DEBUG?: unknown };

const loadContentScript = async (runtime: ChromeStub['runtime']) => {
  globals.chrome = { runtime };
  vi.resetModules();
  await import('../content_script');
};

describe('content_script reconnection', () => {
  const originalChrome = globals.chrome;
  const originalHook = globals.REACT_GLOBAL_STATE_HOOK_DEBUG;

  beforeEach(() => {
    vi.useFakeTimers();
    delete globals.REACT_GLOBAL_STATE_HOOK_DEBUG;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    globals.chrome = originalChrome;
    globals.REACT_GLOBAL_STATE_HOOK_DEBUG = originalHook;
  });

  it('stops without logging once the extension context is invalidated', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const connect = vi.fn(() => {
      throw new Error('Extension context invalidated.');
    });

    await loadContentScript({ id: undefined, connect });
    window.postMessage({ action: 'monkey-patch/START_ACTION' }, '*');
    await vi.advanceTimersByTimeAsync(30_000);

    expect(connect).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('keeps retrying while the context is valid but the connection fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const connect = vi.fn(() => {
      throw new Error('Could not establish connection.');
    });

    await loadContentScript({ id: 'extension-id', connect });
    await vi.advanceTimersByTimeAsync(10_000);

    expect(connect.mock.calls.length).toBeGreaterThan(2);
  });
});
