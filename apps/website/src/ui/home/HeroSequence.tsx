import { useEffect, useMemo, useRef, useState } from 'react';
import { CodeList } from './CodeList';
import { Icon } from '../Icon';
import { announce } from '../../state/toast';
import { copyText } from '../shell/CopyController';
import { useStory } from './useStory';

/**
 * One story, told once: a store is created, two components subscribe to it, and then two updates
 * travel down the subscriptions. The second update never reaches the selector, which is the point.
 * The code on the left and the graph on the right are two views of the same step.
 */

const STEPS = [
  { title: 'Create the state', hint: 'One store. Two values.' },
  { title: 'Subscribe', hint: 'The whole state.' },
  { title: 'Select', hint: 'One value out of it.' },
  { title: 'Update theme', hint: 'Both subscriptions depend on it.' },
  { title: 'Update name', hint: 'Only one of them does.' },
] as const;

/** Every step is held for the same beat, so the story keeps one rhythm. */
const STEP_MS = 3200;
const DURATIONS = STEPS.map(() => STEP_MS);

const CREATE = `import { createGlobalState } from 'react-global-state-hooks';

const useProfile = createGlobalState({
  name: 'Ada',
  theme: 'light',
});`;

const PROFILE = `function Profile() {
  const [profile] = useProfile();

  return <span>{profile.name}</span>;
}`;

const THEME_LABEL = `function ThemeLabel() {
  const [theme] = useProfile((state) => state.theme);

  return <span>{theme}</span>;
}`;

const SET_THEME = `// later, from a control inside the app
useProfile.setState((state) => ({ ...state, theme: 'dark' }));`;
const SET_NAME = `useProfile.setState((state) => ({ ...state, name: 'Lin' }));`;

/** The code as it stands at each step, plus the lines that step is responsible for. */
function scriptFor(step: number) {
  const blocks = [CREATE];
  if (step >= 1) blocks.push(PROFILE);
  if (step >= 2) blocks.push(THEME_LABEL);
  if (step >= 3) blocks.push(SET_THEME);
  if (step >= 4) blocks.push(SET_NAME);

  const code = blocks.join('\n\n');
  const lines = code.split('\n');
  const previous = step === 0 ? 0 : blocks.slice(0, -1).join('\n\n').split('\n').length + 1;
  const emphasis = step === 0 ? [2, 3, 4, 5] : [...Array(lines.length - previous)].map((_, index) => previous + index);

  return { code, emphasis };
}

const plural = (count: number) => `${count} update${count === 1 ? '' : 's'}`;

/** How long a node keeps its highlight after the change that reached it. */
const FLASH = 900;

/** What the running application looks like at each step. -1 is the empty application. */
function stateFor(step: number) {
  return {
    hasContext: step >= 0,
    name: step >= 4 ? 'Lin' : 'Ada',
    theme: step >= 3 ? 'dark' : 'light',
    hasProfile: step >= 1,
    hasThemeLabel: step >= 2,
    changed: step === 3 ? ('theme' as const) : step === 4 ? ('name' as const) : null,
    profileUpdates: step >= 4 ? 2 : step >= 3 ? 1 : 0,
    themeUpdates: step >= 3 ? 1 : 0,
  };
}

/** What the arriving step adds or changes, which is what gets the flash and the little grow. */
function arrivalOf(step: number) {
  return {
    context: step === 0 ? ('enter' as const) : step === 3 || step === 4 ? ('update' as const) : null,
    profile: step === 1 ? ('enter' as const) : step === 3 || step === 4 ? ('update' as const) : null,
    themeLabel: step === 2 ? ('enter' as const) : step === 3 ? ('update' as const) : null,
  };
}

export function HeroSequence() {
  const stage = useRef<HTMLDivElement>(null);
  const toProfile = useRef<SVGPathElement>(null);
  const toThemeLabel = useRef<SVGPathElement>(null);
  const running = useRef(new Set<Animation>());
  const scroller = useRef<HTMLDivElement>(null);
  const story = useStory(DURATIONS, stage);

  const { step } = story;
  const { code, emphasis } = useMemo(() => scriptFor(step), [step]);

  // The application on the right is built from the code on the left: it starts empty and grows.
  const [shown, setShown] = useState(-1);
  const [fresh, setFresh] = useState(false);
  const app = stateFor(shown);
  const arriving = fresh ? arrivalOf(shown) : { context: null, profile: null, themeLabel: null };

  useEffect(() => {
    setShown(step);
    setFresh(true);
  }, [step]);

  useEffect(() => {
    if (!fresh) return;
    const fade = setTimeout(() => setFresh(false), FLASH);

    return () => clearTimeout(fade);
  }, [fresh, shown]);

  // A pulse runs down a subscription only when that subscription actually receives the change.
  useEffect(() => {
    running.current.forEach((animation) => animation.cancel());
    running.current.clear();

    const pulse = (path: SVGPathElement | null, on: boolean) => {
      if (!path) return;
      path.style.opacity = on ? '1' : '0';
      if (!on || story.reduced || !path.animate) return;

      const length = path.getTotalLength();
      path.style.strokeDasharray = `${length} ${length}`;
      const animation = path.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], {
        duration: 700,
        easing: 'cubic-bezier(.22,1,.36,1)',
        fill: 'forwards',
      });
      running.current.add(animation);
      animation.onfinish = () => {
        path.style.strokeDashoffset = '0';
        running.current.delete(animation);
        animation.cancel();
      };
    };

    pulse(toProfile.current, app.changed !== null);
    pulse(toThemeLabel.current, app.changed === 'theme');
  }, [app.changed, shown, story.reduced]);

  // The frame never grows: new lines arrive at the bottom and the earlier ones scroll out of sight.
  useEffect(() => {
    const box = scroller.current;
    if (!box) return;

    const last = box.querySelector<HTMLElement>('.code-line:last-of-type');
    const top = last ? Math.max(0, last.offsetTop + last.offsetHeight - box.clientHeight) : 0;
    box.scrollTo({ top, behavior: story.reduced ? 'auto' : 'smooth' });
  }, [step, story.reduced]);

  useEffect(() => {
    const onPlay = (event: Event) => {
      if (!(event.target as HTMLElement).closest('[data-hero-play]')) return;
      event.preventDefault();
      stage.current?.scrollIntoView({ behavior: story.reduced ? 'instant' : 'smooth', block: 'center' });
      story.go(0);
    };
    document.addEventListener('click', onPlay);

    return () => document.removeEventListener('click', onPlay);
  }, [story]);

  const onStepKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') story.go(0);
    else if (event.key === 'End') story.go(STEPS.length - 1);
    else if (event.key === 'ArrowRight') story.forward();
    else story.back();
  };

  const motion = story.reduced
      ? 'transition-none'
      : 'transition-[opacity,translate,border-color,box-shadow] duration-[420ms] ease-[cubic-bezier(.22,1,.36,1)]';
  const node = `min-w-0 overflow-hidden rounded-control border bg-paper ${motion}`;
  const quiet = 'border-[#dce3d9] dark:border-line';
  const lit = 'border-[#a2bfa3] shadow-[0_0_0_3px_#ecf3e9] dark:border-green dark:shadow-[0_0_0_3px_var(--color-green-soft)]';
  // Arrivals fade up; the grow itself is a keyframe so it can run again on every update it receives.
  const appear = (on: boolean) => (on ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-[6px] opacity-0');
  const grow = (arrival: 'enter' | 'update' | null) =>
    story.reduced || !arrival ? '' : arrival === 'enter' ? 'node-enter' : 'node-pulse';

  return (
    <div
      className="relative mt-10 text-left before:absolute before:-inset-x-[22px] before:-top-5 before:bottom-[43px] before:-z-10 before:rounded-[18px] before:border before:border-[#eff1ed] before:bg-[#fafbf9] before:content-[''] max-sm:mt-[30px] max-sm:before:-inset-x-[9px] max-sm:before:-top-[10px] max-sm:before:rounded-[13px] dark:before:border-soft dark:before:bg-surface"
      id="demo"
      ref={stage}
    >
      <div
        className="overflow-hidden rounded-[11px] border border-[#dfe5df] bg-paper shadow-[0_4px_8px_#273b2903,0_16px_48px_#273b2906] max-sm:rounded-[8px] dark:border-line"
        aria-label="How a store, its subscriptions and an update relate"
      >
        <div className="flex h-[43px] items-center justify-between gap-2 border-b border-line bg-[#fdfefc] px-[19px] max-sm:h-[39px] max-sm:px-3 dark:bg-surface">
          <div className="flex items-center gap-[9px] text-11 text-[#667168] max-sm:gap-[6px] max-sm:text-9 dark:text-muted">
            <span className="mr-[10px] flex gap-[5px] max-sm:mr-[3px] max-sm:gap-[3px]" aria-hidden="true">
              <i className="block size-[6px] rounded-full border border-[#c7d0c8] max-sm:size-1 dark:border-line" />
              <i className="block size-[6px] rounded-full border border-[#c7d0c8] max-sm:size-1 dark:border-line" />
              <i className="block size-[6px] rounded-full border border-[#c7d0c8] max-sm:size-1 dark:border-line" />
            </span>
            profile.tsx
          </div>
          <div className="flex items-center gap-[9px] max-sm:gap-[5px]">
            <span className="font-mono text-9 text-[#646c64] max-sm:text-8 dark:text-muted">
              {step + 1} / {STEPS.length}
            </span>
            <button
              type="button"
              className="inline-flex size-[26px] items-center justify-center rounded-[5px] text-muted hover:bg-[#eef1ed] hover:text-ink max-sm:size-[30px] dark:hover:bg-green-soft"
              data-story-control
              aria-label="Previous step"
              onClick={story.back}
            >
              <Icon name="chevron" className="size-[13px] rotate-180" />
            </button>
            <button
              type="button"
              className="inline-flex size-[26px] items-center justify-center rounded-[5px] text-muted hover:bg-[#eef1ed] hover:text-ink max-sm:size-[30px] dark:hover:bg-green-soft"
              data-story-control
              aria-label="Next step"
              onClick={story.forward}
            >
              <Icon name="chevron" className="size-[13px]" />
            </button>
          </div>
        </div>

        <div className="grid h-[326px] grid-cols-2 max-lg:h-auto max-lg:grid-cols-1 max-sm:flex max-sm:flex-col">
          <div className="code-pane relative flex min-w-0 flex-col overflow-hidden border-r border-line bg-paper px-6 pt-[21px] pb-[18px] max-lg:h-[326px] max-lg:border-r-0 max-lg:border-b max-lg:px-[27px] max-lg:py-5 max-sm:h-[286px] max-sm:border-b-0 max-sm:px-[10px] max-sm:py-[15px]">
            <div className="mb-[14px] ml-5 flex items-center justify-between gap-2 font-mono text-10 text-[#666c67] max-lg:ml-4 max-sm:mb-[9px] max-sm:ml-[14px] max-sm:text-9 dark:text-muted">
              <span>
                <span className="mr-[6px] rounded-[3px] border border-[#dde3ef] px-[3px] py-[2px] text-9 text-blue dark:border-line">TS</span>
                profile.tsx
              </span>
              <button
                type="button"
                className="inline-flex size-[25px] items-center justify-center rounded-[5px] text-muted hover:bg-[#eef1ed] hover:text-ink max-sm:size-[30px] dark:hover:bg-green-soft"
                data-story-control
                aria-label="Copy the current code"
                onClick={async () => {
                  announce((await copyText(code)) ? 'Code example copied.' : 'Clipboard unavailable. Select and copy the code directly.');
                }}
              >
                <Icon name="copy" className="size-[13px]" />
              </button>
            </div>
            <div
              className="min-h-0 flex-1 [scrollbar-width:thin] overflow-y-auto overscroll-contain"
              tabIndex={0}
              role="region"
              aria-label="Example source, scrollable"
              ref={scroller}
            >
              <CodeList
                code={code}
                emphasis={emphasis}
                animationKey={step}
                label="The example as it stands at this step"
                className="max-lg:text-12 max-lg:leading-6 max-sm:text-11 max-sm:leading-[22px]"
              />
            </div>
          </div>

          <div className="visual-pane relative flex min-w-0 flex-col justify-center overflow-hidden px-7 pt-[21px] pb-[14px] max-lg:px-9 max-lg:pt-5 max-lg:pb-[17px] max-sm:order-first max-sm:border-b max-sm:border-line max-sm:px-[14px] max-sm:pt-4 max-sm:pb-[13px]">
            <div className="mb-[14px] flex min-h-[15px] flex-wrap items-center justify-between gap-x-4 gap-y-1 font-mono text-9 tracking-[0.03em] text-[#656c65] max-lg:mx-auto max-lg:max-w-[540px] max-sm:mb-[13px] max-sm:min-h-[29px] max-sm:text-8 dark:text-muted">
              <span>YOUR APPLICATION</span>
              <span className="text-[#5d7060] dark:text-muted">{STEPS[step].hint}</span>
            </div>

            <div
              className={`relative z-[2] mx-auto w-[236px] overflow-hidden rounded-control border bg-paper shadow-[0_3px_8px_#35493303] max-sm:w-[214px] ${motion} ${arriving.context ? lit : quiet} ${appear(app.hasContext)} ${grow(arriving.context)}`}
              key={`context-${shown}`}
              aria-hidden={!app.hasContext}
            >
              <div className="flex items-center justify-between gap-2 border-b border-[#edf0e9] px-[11px] py-2 font-mono text-11 max-sm:text-10 dark:border-line">
                <span>useProfile</span>
                <Icon name="store" className="size-[14px] text-[#758071] dark:text-muted" />
              </div>
              <div className="grid gap-px p-[6px] font-mono text-10 max-sm:text-9">
                <span className={`rounded-[3px] px-[6px] py-[3px] transition-colors duration-[280ms] ${app.changed === 'name' ? 'bg-[#e6f0e4] dark:bg-green-soft' : ''}`}>
                  name: <b className="font-normal text-[#47644c] dark:text-green">'{app.name}'</b>
                </span>
                <span className={`rounded-[3px] px-[6px] py-[3px] transition-colors duration-[280ms] ${app.changed === 'theme' ? 'bg-[#e6f0e4] dark:bg-green-soft' : ''}`}>
                  theme: <b className="font-normal text-[#47644c] dark:text-green">'{app.theme}'</b>
                </span>
              </div>
            </div>

            <div className="branch relative mx-auto h-11 w-3/4 max-lg:max-w-[340px] max-sm:h-[35px] max-sm:w-[62%]" aria-hidden="true">
              <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 360 44" preserveAspectRatio="none">
                <path
                  className={`track ${story.reduced ? '' : 'transition-opacity duration-[420ms]'}`}
                  d="M180 0V13Q180 22 170 22H50Q40 22 40 31V44"
                  opacity={app.hasProfile ? 1 : 0}
                />
                <path
                  className={`track ${story.reduced ? '' : 'transition-opacity duration-[420ms]'}`}
                  d="M180 13Q180 22 190 22H310Q320 22 320 31V44"
                  opacity={app.hasThemeLabel ? 1 : 0}
                />
                <path className="signal" ref={toProfile} d="M180 0V13Q180 22 170 22H50Q40 22 40 31V44" />
                <path className="signal" ref={toThemeLabel} d="M180 0V13Q180 22 190 22H310Q320 22 320 31V44" />
              </svg>
            </div>

            <div className="grid grid-cols-2 gap-3 max-lg:mx-auto max-lg:max-w-[520px] max-sm:gap-[10px]">
              <div
                className={`${node} ${app.changed !== null || arriving.profile ? lit : quiet} ${appear(app.hasProfile)} ${grow(arriving.profile)}`}
                key={`profile-${shown}`}
                aria-hidden={!app.hasProfile}
              >
                <div className="flex items-center justify-between gap-[3px] border-b border-[#edf0e9] px-[10px] py-[7px] font-mono text-9 text-[#636c63] max-lg:px-[13px] max-lg:py-2 max-sm:px-[9px] max-sm:py-[7px] max-sm:text-8 dark:border-line dark:text-muted">
                  <span>&lt;Profile /&gt;</span>
                  <Icon name="code" className="size-[11px]" />
                </div>
                <div className="flex items-center gap-2 p-[10px] text-13 font-medium max-lg:p-[13px] max-sm:px-[9px] max-sm:py-[10px] max-sm:text-12">
                  <span className="flex size-[25px] shrink-0 items-center justify-center rounded-full bg-[#eff1e8] text-9 text-[#5e704e] dark:bg-green-soft dark:text-green">{app.name[0]}</span>
                  <span>{app.name}</span>
                </div>
                <div className="flex min-h-[17px] items-center justify-between gap-2 px-[10px] pb-2 font-mono text-8 whitespace-nowrap text-[#656c61] max-lg:pl-[13px] max-sm:px-[9px] max-sm:text-[calc(7px*var(--type-scale))] dark:text-muted">
                  <span className="truncate">useProfile()</span>
                  <span className={`shrink-0 ${app.changed !== null ? 'text-[#426f49] dark:text-green' : ''}`}>{plural(app.profileUpdates)}</span>
                </div>
              </div>

              <div
                className={`${node} ${app.changed === 'theme' || arriving.themeLabel ? lit : quiet} ${appear(app.hasThemeLabel)} ${grow(arriving.themeLabel)}`}
                key={`theme-${shown}`}
                aria-hidden={!app.hasThemeLabel}
              >
                <div className="flex items-center justify-between gap-[3px] border-b border-[#edf0e9] px-[10px] py-[7px] font-mono text-9 text-[#636c63] max-lg:px-[13px] max-lg:py-2 max-sm:px-[9px] max-sm:py-[7px] max-sm:text-8 dark:border-line dark:text-muted">
                  <span>&lt;ThemeLabel /&gt;</span>
                  <Icon name="code" className="size-[11px]" />
                </div>
                <div className="flex items-center gap-2 p-[10px] text-13 font-medium max-lg:p-[13px] max-sm:px-[9px] max-sm:py-[10px] max-sm:text-12">
                  <span className="grid size-[25px] shrink-0 place-items-center rounded-full border border-[#e0e4d8] bg-[#f5f6ee] text-[#858a67] dark:border-line dark:bg-green-soft dark:text-muted">
                    <Icon name={app.theme === 'dark' ? 'moon' : 'sun'} className="size-[13px]" />
                  </span>
                  <span>{app.theme}</span>
                </div>
                <div className="flex min-h-[17px] items-center justify-between gap-2 px-[10px] pb-2 font-mono text-8 whitespace-nowrap text-[#656c61] max-lg:pl-[13px] max-sm:px-[9px] max-sm:text-[calc(7px*var(--type-scale))] dark:text-muted">
                  <span className="truncate">useProfile(s =&gt; s.theme)</span>
                  <span className={`shrink-0 ${app.changed === 'theme' ? 'text-[#426f49] dark:text-green' : ''}`}>{plural(app.themeUpdates)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 border-t border-line max-sm:grid-cols-3" role="tablist" aria-label="Story steps" onKeyDown={onStepKey}>
          {STEPS.map((item, index) => (
            <button
              type="button"
              className="relative rounded-none bg-[#fdfefc] px-[14px] pt-[13px] pb-[14px] text-left text-9 text-[#676c64] hover:bg-[#f7f9f4] aria-selected:bg-[#f4f7f1] aria-selected:text-ink aria-selected:after:absolute aria-selected:after:inset-x-0 aria-selected:after:bottom-0 aria-selected:after:h-[2px] aria-selected:after:bg-[#72926c] aria-selected:after:content-[''] max-sm:px-2 max-sm:py-[10px] max-sm:text-8 dark:bg-surface dark:text-muted dark:hover:bg-soft dark:aria-selected:bg-green-soft dark:aria-selected:after:bg-green [&+&]:border-l [&+&]:border-line"
              role="tab"
              id={`story-step-${index}`}
              data-story-control
              aria-selected={index === step}
              tabIndex={index === step ? 0 : -1}
              onClick={() => story.go(index)}
              key={item.title}
            >
              <span className="mr-[6px] font-mono">0{index + 1}</span>
              {item.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
