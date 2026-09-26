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
    <div className="w-full min-w-0 rounded-panel border border-[#e0e6da] bg-[#f8faf5] p-[22px] max-lg:p-4 max-sm:p-[18px]">
      <div className="mb-[18px] flex items-center justify-between gap-3 font-mono text-9 text-[#68785c]">
        <span>TRY IT · EDIT A VALUE BELOW</span>
        <button type="button" className="inline-flex size-6 items-center justify-center rounded-[5px] text-muted hover:bg-[#eef1ed] hover:text-ink" aria-label="Reset subscription demo" onClick={reset}>
          <Icon name="replay" className="size-[13px]" />
        </button>
      </div>
      <div className="mb-[15px] grid grid-cols-[1.6fr_1fr] gap-[15px] rounded-control border border-[#e2e8d9] bg-paper p-[17px] max-lg:grid-cols-[1.4fr_1fr] max-lg:gap-[10px] max-lg:p-3 max-sm:grid-cols-[1.5fr_1fr] max-sm:p-[14px]">
        <div>
          <label className="mb-[6px] block text-9 text-[#636d59]" htmlFor="profile-name-input">
            Profile name
          </label>
          <input
            id="profile-name-input"
            className="h-[34px] w-full rounded-[4px] border-[#dce4d4] bg-paper px-[9px] py-[6px] text-12 text-[#45543c]"
            value={profile.name}
            maxLength={24}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setProfile((state) => ({ ...state, name: event.target.value }))}
          />
        </div>
        <div>
          <span className="mb-[6px] block text-9 text-[#636d59]" id="theme-label">
            Theme
          </span>
          <div className="flex min-h-[34px] items-center justify-between text-11">
            <span>{profile.theme === 'light' ? 'Light' : 'Dark'}</span>
            <button
              type="button"
              className={`relative h-6 w-[38px] rounded-[11px] border p-[2px] ${profile.theme === 'dark' ? 'border-[#718663] bg-[#718663]' : 'border-[#c7d4bb] bg-[#f0f4ea]'}`}
              role="switch"
              aria-checked={profile.theme === 'dark'}
              aria-labelledby="theme-label"
              onClick={() => setProfile((state) => ({ ...state, theme: state.theme === 'light' ? 'dark' : 'light' }))}
            >
              <span className={`block size-[18px] rounded-full border bg-paper transition-transform duration-200 ${profile.theme === 'dark' ? 'translate-x-[14px] border-white' : 'border-[#b9c9ab]'}`} />
            </button>
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-control border border-[#e1e7d8] bg-paper">
        {rows.map((row) => (
          <div className={`flex items-center justify-between gap-3 p-4 transition-[background] duration-[180ms] max-lg:gap-2 max-lg:px-[10px] max-lg:py-[13px] max-sm:px-[11px] max-sm:py-[14px] [&+&]:border-t [&+&]:border-[#ecf0e5] ${highlighted(row.key) ? 'bg-[#f2f7ec]' : ''}`} key={row.key}>
            <div className="flex min-w-0 items-center gap-[11px] max-sm:gap-2">
              <span className="grid size-[29px] shrink-0 place-items-center rounded-[6px] border border-[#e3eada] bg-[#f2f5ed] text-[#839570] max-lg:hidden max-sm:grid">
                <Icon name={row.icon} className="size-[14px]" />
              </span>
              <div className="min-w-0">
                <div className="text-11 font-medium text-[#536346] max-sm:text-10">
                  {row.label}
                  {row.key !== 'whole' && <span className="ml-[7px] text-10 font-normal text-[#656d5c] max-lg:hidden">{row.key === 'name' ? profile.name || '(empty)' : profile.theme}</span>}
                </div>
                <div className="mt-[3px] font-mono text-9 leading-[1.6] text-[#666d5c] max-sm:text-8">{row.code}</div>
              </div>
            </div>
            <span className={`rounded-[4px] border px-[6px] py-1 font-mono text-9 whitespace-nowrap max-sm:px-[5px] max-sm:py-[3px] max-sm:text-8 ${highlighted(row.key) ? 'border-[#c1d3ae] bg-[#eaf2e1] text-[#4d6d3d]' : 'border-[#e6ecdf] text-[#656d5c]'}`}>
              <b>{counts[row.key]}</b> changes
            </span>
          </div>
        ))}
      </div>
      <div className="mt-[15px] flex items-center justify-between gap-2 text-9 text-[#666d5b] max-sm:text-8">
        <span>Counts selected-value changes, not React renders.</span>
        <button
          type="button"
          className="min-h-6 text-9 text-[#637751] underline underline-offset-[3px] max-sm:text-8"
          onClick={() => setProfile((state) => ({ ...state, name: names[(names.indexOf(state.name as (typeof names)[number]) + 1) % names.length] }))}
        >
          Try another name ↗
        </button>
      </div>
    </div>
  );
}
