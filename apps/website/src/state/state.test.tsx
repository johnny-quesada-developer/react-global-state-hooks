import { renderToString } from 'react-dom/server';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { usePackageManager, usePreferences } from './preferences';
import { useSearchDialog } from './search';

const Probe = () => <span data-testid="pm">{usePackageManager()}</span>;

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  cleanup();
  usePreferences.reset({ packageManager: 'npm', miniMeHidden: false }, {});
  useSearchDialog.reset({ open: false }, {});
});

describe('preferences store', () => {
  it('persists changes under its localStorage key', () => {
    usePreferences.setState((current) => ({ ...current, packageManager: 'pnpm' }));

    const saved = JSON.parse(window.localStorage.getItem('user-preferences') ?? 'null');
    expect(saved.s).toEqual({
      packageManager: 'pnpm',
      miniMeHidden: false,
    });
  });

  it('shares the value between separate React roots', () => {
    render(<Probe />);
    render(<Probe />);

    act(() => usePreferences.setState((current) => ({ ...current, packageManager: 'yarn' })));

    expect(screen.getAllByTestId('pm').map((node) => node.textContent)).toEqual(['yarn', 'yarn']);
  });

  it('server render always uses the default, even when a value is stored', () => {
    usePreferences.setState((current) => ({ ...current, packageManager: 'pnpm' }));

    expect(renderToString(<Probe />)).toContain('>npm<');
  });
});

describe('search dialog store', () => {
  it('opens and closes through actions', () => {
    expect(useSearchDialog.getState().open).toBe(false);

    useSearchDialog.actions.show();
    expect(useSearchDialog.getState().open).toBe(true);

    useSearchDialog.actions.hide();
    expect(useSearchDialog.getState().open).toBe(false);
  });
});
