export type PageProbe = { ok: false } | { ok: true; react: boolean; patch: boolean; reactDevTools: boolean };

export const PAGE_PROBE_EXPRESSION = `(() => {
  const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  const renderers = hook && hook.renderers ? hook.renderers.size : 0;
  const isReactKey = (key) =>
    key.startsWith('__reactContainer$') || key.startsWith('__reactFiber$') || key === '_reactRootContainer';

  let markers = false;
  const walker = document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  for (let seen = 0; node && !markers && seen < 3000; seen += 1) {
    markers = Object.keys(node).some(isReactKey);
    node = walker.nextNode();
  }

  return {
    patch: typeof window.REACT_GLOBAL_STATE_HOOK_DEBUG === 'function',
    reactDevTools: Boolean(hook),
    react: renderers > 0 || markers || Boolean(window.React),
  };
})()`;

const PROBE_TIMEOUT_MS = 3000;

type ProbeResult = { react: boolean; patch: boolean; reactDevTools: boolean };

const isProbeResult = (value: unknown): value is ProbeResult => {
  const candidate = value as Partial<ProbeResult> | null;

  return (
    typeof candidate?.react === 'boolean' &&
    typeof candidate.patch === 'boolean' &&
    typeof candidate.reactDevTools === 'boolean'
  );
};

export const probePage = (): Promise<PageProbe> =>
  new Promise((resolve) => {
    const inspectedWindow = typeof chrome === 'undefined' ? undefined : chrome.devtools?.inspectedWindow;
    if (!inspectedWindow) return resolve({ ok: false });

    const timer = setTimeout(() => resolve({ ok: false }), PROBE_TIMEOUT_MS);

    const finish = (probe: PageProbe) => {
      clearTimeout(timer);
      resolve(probe);
    };

    try {
      inspectedWindow.eval(
        PAGE_PROBE_EXPRESSION,
        (result: unknown, exceptionInfo?: { isError?: boolean; isException?: boolean }) => {
          const failed = exceptionInfo?.isError || exceptionInfo?.isException || !isProbeResult(result);

          finish(failed ? { ok: false } : { ok: true, ...(result as ProbeResult) });
        },
      );
    } catch {
      finish({ ok: false });
    }
  });
