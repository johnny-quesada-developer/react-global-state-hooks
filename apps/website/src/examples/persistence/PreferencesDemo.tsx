import { useEffect, useId, useState } from 'react';
import '../shared/demo.css';
import './persistence.css';
import { RenderCount } from '../shared/RenderCount';
import { useHydrated } from '../../state/useHydrated';
import { ACCENTS, SIZES, STORAGE_KEY, defaults, usePreferences, type Preferences } from './store';

function Choice<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  const group = useId();

  return (
    <fieldset className="segmented">
      <legend>{legend}</legend>
      {options.map((option) => (
        <label key={option}>
          <input type="radio" name={group} checked={value === option} onChange={() => onChange(option)} />
          <span>{option}</span>
        </label>
      ))}
    </fieldset>
  );
}

type Storage = { saved: string; available: boolean };

function readSaved(): Storage {
  try {
    return { saved: window.localStorage.getItem(STORAGE_KEY) ?? '(nothing saved)', available: true };
  } catch {
    return { saved: '(storage unavailable)', available: false };
  }
}

/** Writes the defaults back, which also rewrites the saved value. */
export const resetPreferencesDemo = () => usePreferences.setState({ ...defaults });

export function PreferencesDemo() {
  const [stored, setPreferences] = usePreferences();
  // The store restores from localStorage when this module loads in the browser, before React hydrates.
  // Show the defaults until hydration is done so the page matches the server HTML, then the saved values.
  const hydrated = useHydrated();
  const preferences: Preferences = hydrated ? stored : defaults;

  const [storage, setStorage] = useState<Storage>({ saved: '', available: true });
  useEffect(() => {
    setStorage(readSaved());

    // Subscribers run before the store writes to localStorage, so read the saved value a moment later.
    return usePreferences.subscribe(() => queueMicrotask(() => setStorage(readSaved())), { skipFirst: true });
  }, []);

  const update = (patch: Partial<Preferences>) => setPreferences((current) => ({ ...current, ...patch }));

  return (
    <div className="demo">
      <div className="demo-grid demo-grid--stack">
        <section className="demo-card" aria-label="Preferences">
          <RenderCount />
          <div className="pref-row">
            <div>
              <strong>Accent</strong>
              <p>Saved. Only this preview changes.</p>
            </div>
            <Choice legend="Accent" options={ACCENTS} value={preferences.accent} onChange={(accent) => update({ accent })} />
          </div>
          <div className="pref-row">
            <div>
              <strong>Text size</strong>
              <p>Saved with the accent.</p>
            </div>
            <Choice legend="Text size" options={SIZES} value={preferences.size} onChange={(size) => update({ size })} />
          </div>
          <label className="pref-check">
            <span>Compact layout</span>
            <input type="checkbox" checked={preferences.compact} onChange={() => update({ compact: !preferences.compact })} />
          </label>
          <label className="pref-draft">
            Draft note (not saved)
            <input value={preferences.draft} placeholder="This will not be saved" maxLength={60} onChange={(event) => update({ draft: event.target.value })} />
          </label>
        </section>

        <section className="demo-card" aria-label="Preview">
          <div
            className={`pref-preview pref-preview--${preferences.accent} pref-preview--${preferences.size}${preferences.compact ? ' pref-preview--compact' : ''}`}
            data-testid="preview"
          >
            <strong>Preview</strong>
            <p>{preferences.draft || 'Your draft appears here.'}</p>
          </div>
          <span>Saved in localStorage</span>
          <pre className="demo-json" data-testid="saved">
            {storage.saved}
          </pre>
          <p className={`pref-status${storage.available ? '' : ' pref-status--unavailable'}`} role="status">
            {storage.available
              ? 'Reload this page: the saved values come back and the draft does not.'
              : 'Storage unavailable — changes are session-only'}
          </p>
        </section>
      </div>
    </div>
  );
}
