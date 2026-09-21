import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PAGE_PROBE_EXPRESSION, probePage } from '../probePage';

type PageGlobals = {
  REACT_GLOBAL_STATE_HOOK_DEBUG?: unknown;
  __REACT_DEVTOOLS_GLOBAL_HOOK__?: unknown;
  React?: unknown;
};

const page = window as unknown as PageGlobals;
const runInPage = () => window.eval(PAGE_PROBE_EXPRESSION) as { react: boolean; patch: boolean; reactDevTools: boolean };

describe('PAGE_PROBE_EXPRESSION', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"><section><p>hello</p></section></div>';
  });

  afterEach(() => {
    delete page.REACT_GLOBAL_STATE_HOOK_DEBUG;
    delete page.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    delete page.React;
  });

  it('reports a plain page as no React, no patch, no React DevTools', () => {
    expect(runInPage()).toEqual({ react: false, patch: false, reactDevTools: false });
  });

  it('finds React through the marker React puts on its root container', () => {
    (document.getElementById('root') as unknown as Record<string, unknown>)['__reactContainer$x1'] = {};

    expect(runInPage().react).toBe(true);
  });

  it('finds React through a fiber marker on a deeply nested node', () => {
    (document.querySelector('p') as unknown as Record<string, unknown>)['__reactFiber$x1'] = {};

    expect(runInPage().react).toBe(true);
  });

  it('finds React through a renderer registered on the DevTools hook, and reports the hook', () => {
    page.__REACT_DEVTOOLS_GLOBAL_HOOK__ = { renderers: new Map([[1, {}]]) };

    expect(runInPage()).toEqual({ react: true, patch: false, reactDevTools: true });
  });

  it('reports the hook without React when no renderer attached', () => {
    page.__REACT_DEVTOOLS_GLOBAL_HOOK__ = { renderers: new Map() };

    expect(runInPage()).toEqual({ react: false, patch: false, reactDevTools: true });
  });

  it('reports the patch once the debug entry installed its hook', () => {
    page.REACT_GLOBAL_STATE_HOOK_DEBUG = () => undefined;

    expect(runInPage().patch).toBe(true);
  });
});

describe('probePage', () => {
  const globals = globalThis as unknown as { chrome: unknown };
  const originalChrome = globals.chrome;

  const withEval = (implementation: (expression: string, callback: (...args: unknown[]) => void) => void) => {
    globals.chrome = { devtools: { inspectedWindow: { tabId: 1, eval: vi.fn(implementation) } } };
  };

  beforeEach(() => vi.useFakeTimers());

  afterEach(() => {
    vi.useRealTimers();
    globals.chrome = originalChrome;
  });

  it('resolves the probe result the page returned', async () => {
    withEval((_expression, callback) => callback({ react: true, patch: true, reactDevTools: false }));

    await expect(probePage()).resolves.toEqual({ ok: true, react: true, patch: true, reactDevTools: false });
  });

  it('resolves not ok when the evaluation fails', async () => {
    withEval((_expression, callback) => callback(undefined, { isError: true }));

    await expect(probePage()).resolves.toEqual({ ok: false });
  });

  it('resolves not ok when the result is not the expected shape', async () => {
    withEval((_expression, callback) => callback('location'));

    await expect(probePage()).resolves.toEqual({ ok: false });
  });

  it('resolves not ok when eval throws or is unavailable', async () => {
    withEval(() => {
      throw new Error('no permission');
    });
    await expect(probePage()).resolves.toEqual({ ok: false });

    globals.chrome = undefined;
    await expect(probePage()).resolves.toEqual({ ok: false });
  });

  it('gives up after a few seconds when the page never answers', async () => {
    withEval(() => undefined);
    const probe = probePage();

    await vi.advanceTimersByTimeAsync(3000);

    await expect(probe).resolves.toEqual({ ok: false });
  });
});
