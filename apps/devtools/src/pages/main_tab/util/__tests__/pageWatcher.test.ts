import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageProbe } from '../probePage';

const missing: PageProbe = { ok: true, react: true, patch: false, reactDevTools: true };
const ready: PageProbe = { ok: true, react: true, patch: true, reactDevTools: true };

const globals = globalThis as unknown as { chrome: unknown };

const load = async (probes: PageProbe[]) => {
  const probePage = vi.fn(async () => probes.shift() ?? ready);
  let onNavigated: (() => void) | undefined;
  globals.chrome = {
    devtools: {
      inspectedWindow: { tabId: 1 },
      network: { onNavigated: { addListener: vi.fn((listener: () => void) => (onNavigated = listener)) } },
    },
  };

  vi.resetModules();
  vi.doMock('../probePage', () => ({ probePage }));
  const watcher = await import('../pageWatcher');
  const { pageDiagnosis$ } = await import('../../hooks/pageDiagnosis');

  return { probePage, watcher, pageDiagnosis$, navigate: () => onNavigated?.() };
};

describe('page watcher', () => {
  const originalChrome = globals.chrome;

  beforeEach(() => vi.useFakeTimers());

  afterEach(() => {
    vi.useRealTimers();
    vi.doUnmock('../probePage');
    globals.chrome = originalChrome;
  });

  it('probes right away, keeps probing every second while the patch is missing, then stops', async () => {
    const { probePage, watcher, pageDiagnosis$ } = await load([missing, missing, missing, ready]);

    watcher.startPageWatcher();
    await vi.advanceTimersByTimeAsync(0);
    expect(probePage).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2000);
    expect(probePage).toHaveBeenCalledTimes(3);
    expect(pageDiagnosis$.getState().problem).toBe('no-patch');

    await vi.advanceTimersByTimeAsync(1000);
    expect(probePage).toHaveBeenCalledTimes(4);
    expect(pageDiagnosis$.getState().problem).toBeNull();

    await vi.advanceTimersByTimeAsync(20_000);
    expect(probePage).toHaveBeenCalledTimes(4);
  });

  it('starts over when the inspected page navigates', async () => {
    const { probePage, watcher, navigate } = await load([ready, ready]);

    watcher.startPageWatcher();
    await vi.advanceTimersByTimeAsync(5000);
    expect(probePage).toHaveBeenCalledTimes(1);

    navigate();
    await vi.advanceTimersByTimeAsync(0);
    expect(probePage).toHaveBeenCalledTimes(2);
  });
});
