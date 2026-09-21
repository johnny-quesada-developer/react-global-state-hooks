import { beforeEach, describe, expect, it } from 'vitest';
import { isFallbackVisible, pageDiagnosis$, shouldSuggestReactDevTools } from '../pageDiagnosis';

const ready = { ok: true, react: true, patch: true, reactDevTools: true } as const;
const withoutReact = { ok: true, react: false, patch: false, reactDevTools: false } as const;
const withoutPatch = { ok: true, react: true, patch: false, reactDevTools: true } as const;

beforeEach(() =>
  pageDiagnosis$.setState({
    probe: null,
    problem: null,
    streak: 0,
    forced: false,
    reactDevToolsNoticeDismissed: false,
  }),
);

describe('pageDiagnosis', () => {
  it('shows a problem only after it is confirmed by a second probe', () => {
    pageDiagnosis$.actions.probed(withoutReact);
    expect(isFallbackVisible(pageDiagnosis$.getState())).toBe(false);

    pageDiagnosis$.actions.probed(withoutReact);
    expect(pageDiagnosis$.getState().problem).toBe('no-react');
    expect(isFallbackVisible(pageDiagnosis$.getState())).toBe(true);
  });

  it('restarts the count when the problem changes and clears it when the page becomes ready', () => {
    pageDiagnosis$.actions.probed(withoutReact);
    pageDiagnosis$.actions.probed(withoutPatch);
    expect(pageDiagnosis$.getState()).toMatchObject({ problem: 'no-patch', streak: 1 });

    pageDiagnosis$.actions.probed(ready);
    expect(pageDiagnosis$.getState()).toMatchObject({ problem: null, streak: 0 });
    expect(isFallbackVisible(pageDiagnosis$.getState())).toBe(false);
  });

  it('never declares a problem when the probe could not run', () => {
    pageDiagnosis$.actions.probed({ ok: false });
    pageDiagnosis$.actions.probed({ ok: false });

    expect(isFallbackVisible(pageDiagnosis$.getState())).toBe(false);
  });

  it('hides a confirmed problem after "show anyway" until the page becomes ready again', () => {
    pageDiagnosis$.actions.probed(withoutReact);
    pageDiagnosis$.actions.probed(withoutReact);
    pageDiagnosis$.actions.showAnyway();
    expect(isFallbackVisible(pageDiagnosis$.getState())).toBe(false);

    pageDiagnosis$.actions.probed(withoutReact);
    expect(isFallbackVisible(pageDiagnosis$.getState())).toBe(false);

    pageDiagnosis$.actions.probed(ready);
    pageDiagnosis$.actions.probed(withoutReact);
    pageDiagnosis$.actions.probed(withoutReact);
    expect(isFallbackVisible(pageDiagnosis$.getState())).toBe(true);
  });

  it('suggests React DevTools only when the patch is loaded without the hook, until dismissed', () => {
    pageDiagnosis$.actions.probed({ ...ready, reactDevTools: false });
    expect(shouldSuggestReactDevTools(pageDiagnosis$.getState())).toBe(true);

    pageDiagnosis$.actions.dismissReactDevToolsNotice();
    expect(shouldSuggestReactDevTools(pageDiagnosis$.getState())).toBe(false);

    pageDiagnosis$.actions.probed(ready);
    expect(shouldSuggestReactDevTools(pageDiagnosis$.getState())).toBe(false);
  });
});
