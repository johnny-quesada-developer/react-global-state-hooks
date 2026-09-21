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

function readSaved(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? '(nothing saved)';
  } catch {
    return '(storage unavailable)';
  }
}

export function PreferencesDemo() {
  const [stored, setPreferences] = usePreferences();
  // The store restores from localStorage when this module loads in the browser, before React hydrates.
  // Show the defaults until hydration is done so the page matches the server HTML, then the saved values.
  const hydrated = useHydrated();
  const preferences: Preferences = hydrated ? stored : defaults;

  const [saved, setSaved] = useState('');
  useEffect(() => {
    setSaved(readSaved());

    // Subscribers run before the store writes to localStorage, so read the saved value a moment later.
    return usePreferences.subscribe(() => queueMicrotask(() => setSaved(readSaved())), { skipFirst: true });
  }, []);

  const update = (patch: Partial<Preferences>) => setPreferences((current) => ({ ...current, ...patch }));

  return (
    <div className="demo">
      <div className="demo-grid demo-grid--wide">
        <section className="demo-card" aria-label="Preferences">
          <RenderCount />
          <Choice
            legend="Accent"
            options={ACCENTS}
            value={preferences.accent}
            onChange={(accent) => update({ accent })}
          />
          <Choice
            legend="Text size"
            options={SIZES}
            value={preferences.size}
            onChange={(size) => update({ size })}
          />
          <label className="pref-check">
            <input
              type="checkbox"
              checked={preferences.compact}
              onChange={() => update({ compact: !preferences.compact })}
            />
            <span>Compact layout</span>
          </label>
          <label>
            Draft note (not saved)
            <input value={preferences.draft} onChange={(event) => update({ draft: event.target.value })} />
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
          <span className="pref-caption">Saved in localStorage</span>
          <pre className="demo-json" data-testid="saved">
            {saved}
          </pre>
        </section>
      </div>
      <p className="section__lede">
        Change something, then reload this page: the saved values come back and the draft does not.
      </p>
      <button type="button" className="demo-reset" onClick={() => usePreferences.reset()}>
        Clear saved data
      </button>
    </div>
  );
}
