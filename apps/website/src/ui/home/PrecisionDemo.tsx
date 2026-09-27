import { useEffect, useState } from 'react';
import { Icon, type IconName } from '../Icon';
import { initialProfile, names, useDemoProfile } from './precisionStore';

type Key = 'name' | 'theme' | 'whole';

const rows: { key: Key; icon: IconName; label: string; code: string }[] = [
  { key: 'name', icon: 'user', label: 'ProfileName', code: 'useProfile(s => s.name)' },
  { key: 'theme', icon: 'sun', label: 'ThemeLabel', code: 'useProfile(s => s.theme)' },
  { key: 'whole', icon: 'store', label: 'WholeStore', code: 'useProfile()' },
];

const zero = () => ({ name: 0, theme: 0, whole: 0 });

/**
 * Three subscriptions to one real store. Each counter is incremented by that subscription's own callback,
 * so the numbers are selected-value changes as the library reports them, not React renders.
 */
export function PrecisionDemo() {
  const [profile, setProfile] = useDemoProfile();
  const [counts, setCounts] = useState(zero);
  const [changed, setChanged] = useState<Key | null>(null);

  useEffect(() => {
    const bump = (key: Key) => setCounts((current) => ({ ...current, [key]: current[key] + 1 }));
    const unsubscribe = [
      useDemoProfile.subscribe((state) => state.name, () => {
        bump('name');
        setChanged('name');
      }, { skipFirst: true }),
      useDemoProfile.subscribe((state) => state.theme, () => {
        bump('theme');
        setChanged('theme');
      }, { skipFirst: true }),
      useDemoProfile.subscribe(() => bump('whole'), { skipFirst: true }),
    ];

    return () => unsubscribe.forEach((stop) => stop());
  }, []);

  const reset = () => {
    useDemoProfile.setState(initialProfile());
    setCounts(zero());
    setChanged(null);
  };

  const highlighted = (key: Key) => changed !== null && (key === changed || key === 'whole');

  return (
    <div className="w-full min-w-0 rounded-panel border border-[light-dark(#e0e6da,#20241d)] bg-[light-dark(#f8faf5,#111412)] p-[22px] max-lg:p-4 max-sm:p-[18px]">
      <div className="mb-[18px] flex items-center justify-between gap-3 font-mono text-9 text-[light-dark(#68785c,#7d8e71)]">
        <span>TRY IT · EDIT A VALUE BELOW</span>
        <button type="button" className="inline-flex size-6 items-center justify-center rounded-[5px] text-muted hover:bg-[light-dark(#eef1ed,#171b18)] hover:text-ink" aria-label="Reset subscription demo" onClick={reset}>
          <Icon name="replay" className="size-[13px]" />
        </button>
      </div>
      <div className="mb-[15px] grid grid-cols-[1.6fr_1fr] gap-[15px] rounded-control border border-[light-dark(#e2e8d9,#1f231a)] bg-paper p-[17px] max-lg:grid-cols-[1.4fr_1fr] max-lg:gap-[10px] max-lg:p-3 max-sm:grid-cols-[1.5fr_1fr] max-sm:p-[14px]">
        <div>
          <label className="mb-[6px] block text-9 text-[light-dark(#636d59,#8b9580)]" htmlFor="profile-name-input">
            Profile name
          </label>
          <input
            id="profile-name-input"
            className="h-[34px] w-full rounded-[4px] border-[light-dark(#dce4d4,#22271d)] bg-paper px-[9px] py-[6px] text-12 text-[light-dark(#45543c,#a4b59a)]"
            value={profile.name}
            maxLength={24}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setProfile((state) => ({ ...state, name: event.target.value }))}
          />
        </div>
        <div>
          <span className="mb-[6px] block text-9 text-[light-dark(#636d59,#8b9580)]" id="theme-label">
            Theme
          </span>
          <div className="flex min-h-[34px] items-center justify-between text-11">
            <span>{profile.theme === 'light' ? 'Light' : 'Dark'}</span>
            <button
              type="button"
              className={`relative h-6 w-[38px] rounded-[11px] border p-[2px] ${profile.theme === 'dark' ? 'border-[light-dark(#718663,#6e8360)] bg-[light-dark(#718663,#6e8360)]' : 'border-[light-dark(#c7d4bb,#2d3625)] bg-[light-dark(#f0f4ea,#171913)]'}`}
              role="switch"
              aria-checked={profile.theme === 'dark'}
              aria-labelledby="theme-label"
              onClick={() => setProfile((state) => ({ ...state, theme: state.theme === 'light' ? 'dark' : 'light' }))}
            >
              <span className={`block size-[18px] rounded-full border bg-paper transition-transform duration-200 ${profile.theme === 'dark' ? 'translate-x-[14px] border-white' : 'border-[light-dark(#b9c9ab,#344128)]'}`} />
            </button>
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-control border border-[light-dark(#e1e7d8,#20241a)] bg-paper">
        {rows.map((row) => (
          <div className={`flex items-center justify-between gap-3 p-4 transition-[background] duration-[180ms] max-lg:gap-2 max-lg:px-[10px] max-lg:py-[13px] max-sm:px-[11px] max-sm:py-[14px] [&+&]:border-t [&+&]:border-[light-dark(#ecf0e5,#1a1c15)] ${highlighted(row.key) ? 'bg-[light-dark(#f2f7ec,#151711)]' : ''}`} key={row.key}>
            <div className="flex min-w-0 items-center gap-[11px] max-sm:gap-2">
              <span className="grid size-[29px] shrink-0 place-items-center rounded-[6px] border border-[light-dark(#e3eada,#1e2218)] bg-[light-dark(#f2f5ed,#141816)] text-[light-dark(#839570,#61724f)] max-lg:hidden max-sm:grid">
                <Icon name={row.icon} className="size-[14px]" />
              </span>
              <div className="min-w-0">
                <div className="text-11 font-medium text-[light-dark(#536346,#93a585)] max-sm:text-10">
                  {row.label}
                  {row.key !== 'whole' && <span className="ml-[7px] text-10 font-normal text-[light-dark(#656d5c,#8b9482)] max-lg:hidden">{row.key === 'name' ? profile.name || '(empty)' : profile.theme}</span>}
                </div>
                <div className="mt-[3px] font-mono text-9 leading-[1.6] text-[light-dark(#666d5c,#8c9381)] max-sm:text-8">{row.code}</div>
              </div>
            </div>
            <span className={`rounded-[4px] border px-[6px] py-1 font-mono text-9 whitespace-nowrap max-sm:px-[5px] max-sm:py-[3px] max-sm:text-8 ${highlighted(row.key) ? 'border-[light-dark(#c1d3ae,#2d3a1b)] bg-[light-dark(#eaf2e1,#181c12)] text-[light-dark(#4d6d3d,#82a471)]' : 'border-[light-dark(#e6ecdf,#1c2018)] text-[light-dark(#656d5c,#8b9482)]'}`}>
              <b>{counts[row.key]}</b> changes
            </span>
          </div>
        ))}
      </div>
      <div className="mt-[15px] flex items-center justify-between gap-2 text-9 text-[light-dark(#666d5b,#8c9380)] max-sm:text-8">
        <span>Counts selected-value changes, not React renders.</span>
        <button
          type="button"
          className="min-h-6 text-9 text-[light-dark(#637751,#7d926b)] underline underline-offset-[3px] max-sm:text-8"
          onClick={() => setProfile((state) => ({ ...state, name: names[(names.indexOf(state.name as (typeof names)[number]) + 1) % names.length] }))}
        >
          Try another name ↗
        </button>
      </div>
    </div>
  );
}
