import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  window.localStorage.clear();
  vi.resetModules();
});
afterEach(cleanup);

const stored = () => JSON.parse(window.localStorage.getItem('examples:preferences') ?? 'null');

describe('preferences store', () => {
  it('saves only the selected fields', async () => {
    const { usePreferences } = await import('./store');

    usePreferences.setState((state) => ({ ...state, accent: 'sky', draft: 'secret' }));

    expect(stored().s).toEqual({ accent: 'sky', size: 'medium', compact: false });
  });

  it('restores saved values and drops invalid ones', async () => {
    window.localStorage.setItem(
      'examples:preferences',
      JSON.stringify({ s: { accent: 'sky', size: 'gigantic', compact: true }, v: -1 }),
    );

    const { usePreferences } = await import('./store');

    expect(usePreferences.getState()).toEqual({ accent: 'sky', size: 'medium', compact: true, draft: '' });
  });

  it('reset restores the defaults and the stored value', async () => {
    const { usePreferences } = await import('./store');
    usePreferences.setState((state) => ({ ...state, accent: 'yellow' }));

    usePreferences.reset();

    expect(usePreferences.getState().accent).toBe('mint');
    expect(stored().s.accent).toBe('mint');
  });
});

describe('PreferencesDemo', () => {
  it('renders the defaults on the server even when other values are saved', async () => {
    window.localStorage.setItem(
      'examples:preferences',
      JSON.stringify({ s: { accent: 'yellow', size: 'large', compact: true }, v: -1 }),
    );
    const { PreferencesDemo } = await import('./PreferencesDemo');

    expect(renderToString(<PreferencesDemo />)).toContain('pref-preview--mint');
  });

  it('shows saved values after hydration, updates the saved JSON, and clears it', async () => {
    window.localStorage.setItem(
      'examples:preferences',
      JSON.stringify({ s: { accent: 'yellow', size: 'large', compact: false }, v: -1 }),
    );
    const { PreferencesDemo } = await import('./PreferencesDemo');

    render(<PreferencesDemo />);
    expect(screen.getByTestId('preview').className).toContain('pref-preview--yellow');

    fireEvent.click(screen.getByLabelText('sky'));
    expect(screen.getByTestId('preview').className).toContain('pref-preview--sky');
    await waitFor(() => expect(JSON.parse(screen.getByTestId('saved').textContent!).s.accent).toBe('sky'));

    fireEvent.change(screen.getByLabelText('Draft note (not saved)'), { target: { value: 'hello' } });
    expect(screen.getByText('hello')).toBeTruthy();
    await waitFor(() =>
      expect(JSON.parse(screen.getByTestId('saved').textContent!).s).not.toHaveProperty('draft'),
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Clear saved data' }));
    });
    expect(screen.getByTestId('preview').className).toContain('pref-preview--mint');
  });
});
