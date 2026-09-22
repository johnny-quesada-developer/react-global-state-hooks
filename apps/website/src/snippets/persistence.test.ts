import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  window.localStorage.clear();
  vi.resetModules();
});

const stored = (key: string) => JSON.parse(window.localStorage.getItem(key) ?? 'null');

describe('persistence', () => {
  it('writes the initial state, then every change, as an { s, v } envelope', async () => {
    const { useSettings } = await import('./persistence/versioned');

    expect(stored('docs:settings')).toEqual({ s: { theme: 'light', compact: false }, v: 2 });

    useSettings.setState((state) => ({ ...state, compact: true }));
    expect(stored('docs:settings').s).toEqual({ theme: 'light', compact: true });
  });

  it('runs the migrator when the stored version differs', async () => {
    window.localStorage.setItem('docs:settings', JSON.stringify({ s: { theme: 'dark' }, v: 1 }));

    const { useSettings } = await import('./persistence/versioned');

    expect(useSettings.getState()).toEqual({ theme: 'dark', compact: false });
    expect(stored('docs:settings').v).toBe(2);
  });

  it('selector saves only part of the state and validator sanitizes restored data', async () => {
    window.localStorage.setItem(
      'docs:preferences',
      JSON.stringify({ s: { theme: 'dark', language: 42 }, v: -1 }),
    );

    const { usePreferences } = await import('./persistence/preferences');

    expect(usePreferences.getState()).toEqual({ theme: 'dark', language: 'en', sessionOnly: 'not saved' });
    expect(stored('docs:preferences').s).toEqual({ theme: 'dark', language: 'en' });
  });

  it('a value that is not an envelope is reported and falls back to the initial state', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    window.localStorage.setItem('docs:settings', JSON.stringify({ theme: 'dark' }));

    const { useSettings } = await import('./persistence/versioned');

    expect(useSettings.getState()).toEqual({ theme: 'light', compact: false });
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it('reset() clears the stored value and restores a function initializer', async () => {
    const { useSettings } = await import('./persistence/versioned');
    useSettings.setState((state) => ({ ...state, compact: true }));
    expect(stored('docs:settings').s.compact).toBe(true);

    useSettings.reset();

    // restored from the initial state again, not from the old value
    expect(stored('docs:settings').s.compact).toBe(false);
  });

  it('serialises and restores Date, Map and Set values', async () => {
    const { createGlobalState } = await import('react-global-state-hooks');
    const make = () =>
      createGlobalState(
        { when: new Date(0), tags: new Set<string>(), scores: new Map<string, number>() },
        { localStorage: { key: 'docs:rich' } },
      );

    const first = make();
    first.setState({
      when: new Date('2026-01-02T03:04:05Z'),
      tags: new Set(['a']),
      scores: new Map([['ada', 3]]),
    });

    const second = make();
    const restored = second.getState();
    expect(restored.when).toBeInstanceOf(Date);
    expect(restored.when.toISOString()).toBe('2026-01-02T03:04:05.000Z');
    expect([...restored.tags]).toEqual(['a']);
    expect(restored.scores.get('ada')).toBe(3);
  });
});
