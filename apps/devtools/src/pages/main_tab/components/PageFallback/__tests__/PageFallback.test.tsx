import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DOCS_URL, PageFallback } from '../PageFallback';
import { REACT_DEVTOOLS_URL, ReactDevToolsNotice } from '../ReactDevToolsNotice';
import { pageDiagnosis$ } from '../../../hooks/pageDiagnosis';
import { reloadInspectedPage } from '../../../util/getContentScriptPort';
import { checkPageNow } from '../../../util/pageWatcher';

vi.mock('../../../util/getContentScriptPort', () => ({ reloadInspectedPage: vi.fn() }));
vi.mock('../../../util/pageWatcher', () => ({ checkPageNow: vi.fn() }));

const withoutReact = { ok: true, react: false, patch: false, reactDevTools: false } as const;
const withoutPatch = { ok: true, react: true, patch: false, reactDevTools: true } as const;
const patchedWithoutDevTools = { ok: true, react: true, patch: true, reactDevTools: false } as const;

const confirm = (probe: Parameters<typeof pageDiagnosis$.actions.probed>[0]) =>
  act(() => {
    pageDiagnosis$.actions.probed(probe);
    pageDiagnosis$.actions.probed(probe);
  });

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  act(() =>
    pageDiagnosis$.setState({
      probe: null,
      problem: null,
      streak: 0,
      forced: false,
      reactDevToolsNoticeDismissed: false,
    }),
  );
});

describe('PageFallback', () => {
  it('stays hidden until a problem is confirmed', () => {
    render(<PageFallback />);
    expect(screen.queryByRole('alert')).toBeNull();

    act(() => pageDiagnosis$.actions.probed(withoutReact));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('says the page does not use React and lets you check again or show the panel anyway', () => {
    render(<PageFallback />);
    confirm(withoutReact);

    expect(screen.getByRole('alert').textContent).toContain("This page doesn't use React");
    expect(screen.queryByRole('button', { name: 'Reload page' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Check again' }));
    expect(checkPageNow).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Show anyway' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('explains the missing debug entry, links the docs and offers a reload', () => {
    render(<PageFallback />);
    confirm(withoutPatch);

    expect(screen.getByRole('alert').textContent).toContain("The debug entry isn't loaded on this page");
    expect(screen.getByRole('link', { name: 'How to connect' }).getAttribute('href')).toBe(DOCS_URL);

    fireEvent.click(screen.getByRole('button', { name: 'Reload page' }));
    expect(reloadInspectedPage).toHaveBeenCalledTimes(1);
  });

  it('disappears on its own once the page is fixed', () => {
    render(<PageFallback />);
    confirm(withoutPatch);
    expect(screen.getByRole('alert')).toBeTruthy();

    act(() => pageDiagnosis$.actions.probed({ ...withoutPatch, patch: true }));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('ReactDevToolsNotice', () => {
  it('links the store page when the patch runs without React DevTools, and can be dismissed', () => {
    render(<ReactDevToolsNotice />);
    expect(screen.queryByRole('note')).toBeNull();

    act(() => pageDiagnosis$.actions.probed(patchedWithoutDevTools));
    expect(screen.getByRole('link', { name: 'Install React DevTools' }).getAttribute('href')).toBe(
      REACT_DEVTOOLS_URL,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('stays hidden when React DevTools is installed', () => {
    render(<ReactDevToolsNotice />);

    act(() => pageDiagnosis$.actions.probed({ ...patchedWithoutDevTools, reactDevTools: true }));

    expect(screen.queryByRole('note')).toBeNull();
  });
});
