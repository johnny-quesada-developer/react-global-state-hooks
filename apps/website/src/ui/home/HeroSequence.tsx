import { useEffect, useMemo, useRef, useState } from 'react';
import { announce } from '../../state/toast';
import { copyText } from '../shell/CopyController';
import { Icon } from '../Icon';
import { CodeList } from './CodeList';
import { useAutoplayOnce, useSequence } from './useSequence';

const names = ['Ada', 'Grace', 'Lin'] as const;
type Name = (typeof names)[number];

// 0–2.2 store and consumers · 2.2–4.6 whole-store update · 4.6–6.6 selector · 6.6–9.4 name change highlights
// the selected branch · 9.4–11.8 CLI inspection · 11.8–14.2 read-back · 14.2–16 resolved frame holds.
const DURATIONS = [2200, 2400, 2000, 2800, 2400, 2400, 1800] as const;

const chapters = [
  { title: 'Write naturally.', text: 'The hook API you already know.' },
  { title: 'Update precisely.', text: 'Subscribe to what matters.' },
  { title: 'Debug with evidence.', text: 'Give your agent the actual state.' },
];

const previousName = (name: Name) => (name === 'Ada' ? 'Lin' : name === 'Grace' ? 'Ada' : 'Grace');

function codeFor(chapter: number, name: Name) {
  if (chapter === 2) {
    return `$ npx rgsh --list\nprofile\n\n$ npx rgsh patch profile '{"name":"${name}"}'\n[profile] patch\n  name: "${previousName(name)}" → "${name}"\n\n$ npx rgsh state profile name\n"${name}"\n\n// Read the result. Not an assumption.\n// Illustrative terminal session.`;
  }
  const selected = chapter === 1;
  return `import { createGlobalState } from\n  'react-global-state-hooks';\n\nconst useProfile = createGlobalState(\n  { name: 'Ada', theme: 'light' },\n  { name: 'profile' }\n);\n\nfunction ProfileName() {\n  const [${selected ? 'name' : 'profile'}] = useProfile(${selected ? 's => s.name' : ''});\n  return <span>{${selected ? 'name' : 'profile.name'}}</span>;\n}`;
}

interface Frame {
  chapter: number;
  name: Name;
  changed: boolean;
  caption?: string;
}

/** The chapter and shown name for every step of the automatic run. */
const frameOf = (index: number): Frame =>
  [
    { chapter: 0, name: 'Ada', changed: false },
    { chapter: 0, name: 'Grace', changed: true },
    { chapter: 1, name: 'Grace', changed: false },
    { chapter: 1, name: 'Lin', changed: true },
    { chapter: 2, name: 'Lin', changed: false },
    { chapter: 2, name: 'Ada', changed: true },
    { chapter: 2, name: 'Ada', changed: true, caption: 'The full loop. Write → select → verify.' },
  ][index] as Frame;

const chapterCaption = ['One store. Available to both components.', 'A narrower subscription. A precise update.', 'State your coding agent can read back.'];

/**
 * The three-chapter state story: code on one side, the application's store and consumers on the other.
 * Plays once when visible, pauses out of view, and never overrides a manual selection.
 */
export function HeroSequence() {
  const stage = useRef<HTMLDivElement>(null);
  const sequence = useSequence(DURATIONS, stage);
  const [manual, setManual] = useState<Frame | null>(null);
  const signalName = useRef<SVGPathElement>(null);
  const signalTheme = useRef<SVGPathElement>(null);
  const animations = useRef(new Set<Animation>());

  useAutoplayOnce(stage, sequence);

  const frame = manual ?? frameOf(sequence.started || sequence.finished ? sequence.index : 0);
  const { chapter, name, changed } = frame;
  const code = useMemo(() => codeFor(chapter, name), [chapter, name]);
  const emphasis = chapter === 0 ? [3, 4, 5, 6] : chapter === 1 ? [9] : [7, 8];

  const caption = changed
    ? chapter === 0
      ? 'Whole-store subscribers receive this update.'
      : chapter === 1
        ? 'Name changed. Theme stayed unchanged.'
        : `State read back: name is “${name}”.`
    : chapterCaption[chapter];

  const nameBadge = changed ? (chapter === 0 ? 'store updated' : 'selected value changed') : chapter === 0 ? 'subscribed to the whole store' : 'subscribed to s.name';
  const themeBadge = changed ? (chapter === 0 ? 'whole-store subscription updated' : 'selected value unchanged') : chapter === 0 ? 'subscribed to the whole store' : 'subscribed to s.theme';
  const themeUpdated = changed && chapter === 0;

  // Signal traces run along the branch when a value changes (650 ms, transform/opacity only).
  useEffect(() => {
    animations.current.forEach((animation) => animation.cancel());
    animations.current.clear();

    const trace = (path: SVGPathElement | null, on: boolean) => {
      if (!path) return;
      path.style.opacity = on ? '1' : '0';
      if (!on || sequence.reduced || !path.animate) return;
      const length = path.getTotalLength();
      path.style.strokeDasharray = `${length} ${length}`;
      const animation = path.animate([{ strokeDashoffset: length, opacity: 0.25 }, { strokeDashoffset: 0, opacity: 1 }], {
        duration: 650,
        easing: 'cubic-bezier(.22,1,.36,1)',
        fill: 'forwards',
      });
      animations.current.add(animation);
      animation.onfinish = () => {
        path.style.strokeDashoffset = '0';
        animations.current.delete(animation);
        animation.cancel();
      };
    };

    trace(signalName.current, changed);
    trace(signalTheme.current, themeUpdated);
  }, [changed, themeUpdated, name, chapter, sequence.reduced]);

  useEffect(() => {
    const onPlay = (event: Event) => {
      if (!(event.target as HTMLElement).closest('[data-hero-play]')) return;
      event.preventDefault();
      stage.current?.scrollIntoView({ behavior: sequence.reduced ? 'instant' : 'smooth', block: 'center' });
      if (sequence.reduced) setManual({ chapter: 1, name: 'Grace', changed: true });
      else {
        setManual(null);
        sequence.restart();
      }
    };
    document.addEventListener('click', onPlay);
    return () => document.removeEventListener('click', onPlay);
  }, [sequence]);

  const showChapter = (next: number) => {
    sequence.stop();
    setManual({ chapter: next, name, changed: false });
  };

  const changeName = () => {
    sequence.stop();
    const nextName = names[(names.indexOf(name) + 1) % names.length];
    setManual({ chapter, name: nextName, changed: true });
  };

  const onControl = () => {
    if (sequence.reduced) {
      const nextChapter = (chapter + 1) % 3;
      setManual({ chapter: nextChapter, name: name === 'Ada' ? 'Grace' : 'Ada', changed: false });
      return;
    }
    if (sequence.running) sequence.pause();
    else {
      setManual(null);
      sequence.resume();
    }
  };

  const control = sequence.reduced
    ? { icon: 'chevron' as const, label: 'Next', aria: 'Show next chapter without animation' }
    : sequence.running
      ? { icon: 'pause' as const, label: 'Pause', aria: 'Pause demo' }
      : sequence.started && !sequence.finished
        ? { icon: 'play' as const, label: 'Resume', aria: 'Resume demo' }
        : { icon: 'replay' as const, label: 'Replay', aria: 'Replay demo' };

  const onChapterKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (chapter + (event.key === 'ArrowRight' ? 1 : -1) + 3) % 3;
    showChapter(next);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus({ preventScroll: true });
  };

  return (
    <div className="relative mt-10 text-left before:absolute before:-inset-x-[22px] before:-top-5 before:bottom-[43px] before:-z-10 before:rounded-[18px] before:border before:border-[#eff1ed] before:bg-[#fafbf9] before:content-[''] max-sm:mt-[30px] max-sm:before:-inset-x-[9px] max-sm:before:-top-[10px] max-sm:before:rounded-[13px]" id="demo" ref={stage}>
      <div
        className="overflow-hidden rounded-[11px] border border-[#dfe5df] bg-paper shadow-[0_4px_8px_#273b2903,0_16px_48px_#273b2906] max-sm:rounded-[8px]"
        aria-label="Animated library walkthrough"
        onFocusCapture={(event) => {
          if (!(event.target as HTMLElement).closest('[data-story-control]')) sequence.pause();
        }}
      >
        <div className="flex h-[43px] items-center justify-between gap-2 border-b border-line bg-[#fdfefc] px-[19px] max-sm:h-[39px] max-sm:px-3">
          <div className="flex items-center gap-[9px] text-11 text-[#667168] max-sm:gap-[6px] max-sm:text-9">
            <span className="mr-[10px] flex gap-[5px] max-sm:mr-[3px] max-sm:gap-[3px]" aria-hidden="true">
              <i className="block size-[6px] rounded-full border border-[#c7d0c8] max-sm:size-1" />
              <i className="block size-[6px] rounded-full border border-[#c7d0c8] max-sm:size-1" />
              <i className="block size-[6px] rounded-full border border-[#c7d0c8] max-sm:size-1" />
            </span>
            One change. A clear story.
          </div>
          <div className="flex items-center gap-[9px] max-sm:gap-[5px]">
            <span className="inline-flex items-center gap-[6px] font-mono text-9 text-[#646c64] max-sm:text-8">
              <span className="size-1 rounded-full bg-[#93a98b] max-sm:hidden" />
              INTERACTIVE PREVIEW
            </span>
            <button
              type="button"
              className="flex min-h-[30px] items-center gap-[5px] py-[5px] pl-[7px] text-10 text-[#626e64] max-sm:pl-1 max-sm:text-9"
              data-story-control
              aria-label={control.aria}
              onClick={onControl}
            >
              <Icon name={control.icon} className="size-3 max-sm:size-[11px]" />
              <span>{control.label}</span>
            </button>
          </div>
        </div>

        <div className="grid min-h-[308px] grid-cols-2 max-lg:grid-cols-1 max-sm:flex max-sm:flex-col" role="tabpanel" aria-labelledby={`chapter-${chapter}`}>
          <div className="code-pane relative min-w-0 border-r border-line bg-paper px-6 pt-[21px] pb-[18px] max-lg:border-r-0 max-lg:border-b max-lg:px-[27px] max-lg:py-5 max-sm:min-h-[256px] max-sm:border-b-0 max-sm:px-[10px] max-sm:py-[15px]" data-chapter={chapter} onPointerDown={() => sequence.pause()}>
            <div className="mb-[14px] ml-5 flex items-center justify-between gap-2 font-mono text-10 text-[#666c67] max-lg:ml-4 max-sm:mb-[9px] max-sm:ml-[14px] max-sm:text-9">
              <span>
                <span className="mr-[6px] rounded-[3px] border border-[#dde3ef] px-[3px] py-[2px] text-9 text-blue">{chapter === 2 ? '>_' : 'TS'}</span>
                {chapter === 2 ? 'agent-session' : 'profile.tsx'}
              </span>
              <button
                type="button"
                className="inline-flex size-[25px] items-center justify-center rounded-[5px] text-muted hover:bg-[#eef1ed] hover:text-ink max-sm:size-[30px]"
                data-story-control
                aria-label="Copy the current code example"
                onClick={async () => {
                  sequence.pause();
                  announce((await copyText(code)) ? 'Code example copied.' : 'Clipboard unavailable. Select and copy the code directly.');
                }}
              >
                <Icon name="copy" className="size-[13px]" />
              </button>
            </div>
            <CodeList code={code} emphasis={emphasis} shell={chapter === 2} animationKey={`${chapter}-${name}`} label="Library code example" className="max-lg:text-12 max-lg:leading-6 max-sm:text-11 max-sm:leading-[22px]" />
          </div>

          <div className="visual-pane relative min-w-0 overflow-hidden px-7 pt-[21px] pb-[14px] max-lg:px-9 max-lg:pt-5 max-lg:pb-[17px] max-sm:order-first max-sm:border-b max-sm:border-line max-sm:px-[14px] max-sm:pt-4 max-sm:pb-[13px]">
            <div className="mb-[14px] flex items-center justify-between font-mono text-9 tracking-[0.03em] text-[#656c65] max-lg:mx-auto max-lg:max-w-[540px] max-sm:mb-[13px] max-sm:text-8">
              <span>YOUR APPLICATION</span>
              <span className="text-[#5d7060]">{['one source of truth', 'selected values only', 'inspectable runtime'][chapter]}</span>
            </div>
            <div className="relative z-[2] mx-auto w-[225px] overflow-hidden rounded-control border border-[#dce3d9] bg-paper shadow-[0_3px_8px_#35493303] max-sm:w-[207px]">
              <div className="flex items-center justify-between gap-2 border-b border-[#edf0e9] px-[11px] py-2 font-mono text-11 max-sm:text-10">
                <span>useProfile</span>
                <Icon name="store" className="size-[14px] text-[#758071]" />
              </div>
              <div className="flex items-center justify-center p-2 font-mono text-10 max-sm:text-9">
                <span className={`rounded-[3px] px-[6px] py-px whitespace-nowrap ${changed ? 'bg-[#e6f0e4]' : ''}`}>
                  name: <b className="font-normal text-[#47644c]">'{name}'</b>
                </span>
                <span className="border-l border-line px-[6px] py-px whitespace-nowrap">
                  theme: <b className="font-normal text-[#47644c]">'light'</b>
                </span>
              </div>
            </div>
            <div className="branch relative mx-auto h-11 w-3/4 max-lg:max-w-[340px] max-sm:h-[35px] max-sm:w-[62%]" aria-hidden="true">
              <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 360 44" preserveAspectRatio="none">
                <path className="track" d="M180 0V13Q180 22 170 22H50Q40 22 40 31V44M180 13Q180 22 190 22H310Q320 22 320 31V44" />
                <path className="signal" ref={signalName} d="M180 0V13Q180 22 170 22H50Q40 22 40 31V44" />
                <path className="signal" ref={signalTheme} d="M180 0V13Q180 22 190 22H310Q320 22 320 31V44" />
              </svg>
            </div>
            <div className="grid grid-cols-2 gap-3 max-lg:mx-auto max-lg:max-w-[520px] max-sm:gap-[10px]">
              <div className={`min-w-0 overflow-hidden rounded-control border bg-paper transition-[border-color,box-shadow] duration-[250ms] ${changed ? 'border-[#a2bfa3] shadow-[0_0_0_3px_#ecf3e9]' : 'border-[#dce3d9]'}`}>
                <div className="flex items-center justify-between gap-[3px] border-b border-[#edf0e9] px-[10px] py-[7px] font-mono text-9 text-[#636c63] max-lg:px-[13px] max-lg:py-2 max-sm:px-[9px] max-sm:py-[7px] max-sm:text-8">
                  <span>&lt;ProfileName /&gt;</span>
                  <Icon name="code" className="size-[11px]" />
                </div>
                <div className="flex items-center gap-2 p-[10px] text-13 font-medium max-lg:p-[13px] max-sm:px-[9px] max-sm:py-[10px] max-sm:text-12">
                  <span className="flex size-[25px] shrink-0 items-center justify-center rounded-full bg-[#eff1e8] text-9 text-[#5e704e]">{name[0]}</span>
                  <span>{name}</span>
                </div>
                <div className={`min-h-[19px] px-[10px] pb-2 font-mono text-8 max-lg:pl-[13px] max-sm:px-[9px] max-sm:text-[7px] ${changed ? 'text-[#426f49]' : 'text-[#656c61]'}`}>{nameBadge}</div>
              </div>
              <div className={`min-w-0 overflow-hidden rounded-control border bg-paper transition-[border-color,box-shadow] duration-[250ms] ${themeUpdated ? 'border-[#a2bfa3] shadow-[0_0_0_3px_#ecf3e9]' : 'border-[#dce3d9]'}`}>
                <div className="flex items-center justify-between gap-[3px] border-b border-[#edf0e9] px-[10px] py-[7px] font-mono text-9 text-[#636c63] max-lg:px-[13px] max-lg:py-2 max-sm:px-[9px] max-sm:py-[7px] max-sm:text-8">
                  <span>&lt;ThemeLabel /&gt;</span>
                  <Icon name="code" className="size-[11px]" />
                </div>
                <div className="flex items-center gap-2 p-[10px] text-13 font-medium max-lg:p-[13px] max-sm:px-[9px] max-sm:py-[10px] max-sm:text-12">
                  <span className="grid size-[25px] shrink-0 place-items-center rounded-full border border-[#e0e4d8] bg-[#f5f6ee] text-[#858a67]">
                    <Icon name="sun" className="size-[13px]" />
                  </span>
                  <span>Light theme</span>
                </div>
                <div className={`min-h-[19px] px-[10px] pb-2 font-mono text-8 max-lg:pl-[13px] max-sm:px-[9px] max-sm:text-[7px] ${themeUpdated ? 'text-[#426f49]' : 'text-[#656c61]'}`}>{themeBadge}</div>
              </div>
            </div>
            <div className="mt-[14px] flex min-h-[25px] flex-wrap items-center justify-center gap-[7px] text-10 text-[#626d5d] max-sm:mt-3 max-sm:gap-[5px] max-sm:text-8">
              <Icon name="check" className="size-3" />
              <span>{frame.caption ?? caption}</span>
              <button
                type="button"
                className="ml-1 min-h-[27px] rounded-[4px] border border-[#dce3d6] bg-paper px-[7px] py-[6px] text-9 leading-[1.2] whitespace-nowrap text-[#4b6649] hover:border-[#88a883] hover:bg-[#f5f9f2] max-sm:text-8"
                data-story-control
                onClick={changeName}
              >
                Change name ↗
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 border-t border-line" role="tablist" aria-label="Walkthrough chapters" onKeyDown={onChapterKey}>
          {chapters.map((item, index) => (
            <button
              type="button"
              className="relative flex gap-[13px] rounded-none bg-[#fdfefc] px-[23px] pt-[17px] pb-[18px] text-left text-[#676c64] hover:bg-[#f7f9f4] aria-selected:bg-[#f4f7f1] aria-selected:text-ink aria-selected:after:absolute aria-selected:after:inset-x-0 aria-selected:after:bottom-0 aria-selected:after:h-[2px] aria-selected:after:bg-[#72926c] aria-selected:after:content-[''] max-lg:gap-[9px] max-lg:p-[15px] max-sm:block max-sm:px-[9px] max-sm:py-3 [&+&]:border-l [&+&]:border-line"
              role="tab"
              id={`chapter-${index}`}
              data-story-control
              aria-selected={chapter === index}
              aria-controls="story-panel"
              tabIndex={chapter === index ? 0 : -1}
              key={item.title}
              onClick={() => showChapter(index)}
            >
              <span className={`pt-[2px] font-mono text-10 max-sm:mb-1 max-sm:block max-sm:pt-0 max-sm:text-8 ${chapter === index ? 'text-green' : 'text-[#656c62]'}`}>0{index + 1}</span>
              <span>
                <strong className="block text-12 leading-[1.6] font-[550] max-sm:text-9 max-sm:leading-[1.4]">{item.title}</strong>
                <small className="mt-[2px] block text-10 text-[#656d5f] max-lg:text-9 max-sm:mt-[5px] max-sm:text-8 max-sm:leading-[1.4]">{item.text}</small>
              </span>
            </button>
          ))}
        </div>
      </div>
      <p className="mt-[14px] flex items-center justify-center gap-[7px] text-10 text-[#666c60] max-sm:mt-3 max-sm:gap-[5px] max-sm:text-center max-sm:text-8">
        <Icon name="code" className="size-3 max-sm:size-[10px]" />
        Select a chapter or change a value. This is an interactive concept, not a recording.
      </p>
    </div>
  );
}
