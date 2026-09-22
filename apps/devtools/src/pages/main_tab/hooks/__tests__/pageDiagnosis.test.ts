import { beforeEach, describe, expect, it } from 'vitest';
import { isFallbackVisible, pageDiagnosis$ } from '../pageDiagnosis';

const ready = { ok: true, react: true, patch: true, reactDevTools: true } as const;
const withoutReact = { ok: true, react: false, patch: false, reactDevTools: false } as const;

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
});
