import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { heroVideos } from '../data/heroVideos';
import type { HeroVideo } from '../data/heroVideos';

const WIDE = '(min-width: 48rem)';
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const WATCH_HASH = /^#watch-(.+)$/;
const PANEL_ID = 'hero-video-panel';

const tabId = (id: string) => `watch-${id}`;

interface HeroVideosProps {
  videos?: readonly HeroVideo[];
}

export function HeroVideos({ videos = heroVideos }: HeroVideosProps) {
  const [active, setActive] = useState(0);
  const [wide, setWide] = useState<boolean | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  const video = useRef<HTMLVideoElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const nav = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  const current = videos[active];
  const file = wide === false && current.mobile ? current.mobile : current.landscape;
  const source = wide === null ? undefined : file.src;

  useLayoutEffect(() => {
    setReducedMotion(window.matchMedia(REDUCED_MOTION).matches);

    const query = window.matchMedia(WIDE);
    const choose = () => setWide(query.matches);

    query.addEventListener('change', choose);
    choose();

    return () => query.removeEventListener('change', choose);
  }, []);

  useEffect(() => {
    const go = (initial: boolean) => {
      const id = WATCH_HASH.exec(window.location.hash)?.[1];
      const index = videos.findIndex((item) => item.id === id);
      if (index < 0) return;

      if (!initial) root.current?.scrollIntoView({ block: 'center' });
      if (index === activeRef.current) return;

      setActive(index);
    };

    const onHashChange = () => go(false);

    go(true);
    window.addEventListener('hashchange', onHashChange);

    return () => window.removeEventListener('hashchange', onHashChange);
  }, [videos]);

  const showCount = (visible: boolean) => {
    if (count.current) count.current.hidden = !visible;
  };

  const paint = () => {
    const element = video.current;
    const label = count.current;
    if (!element || !label || !nav.current) return;

    const { duration, currentTime } = element;
    if (!Number.isFinite(duration) || duration <= 0) return;

    const remaining = String(Math.max(0, Math.ceil(duration - currentTime)));
    if (label.textContent !== remaining) label.textContent = remaining;

    nav.current.style.setProperty('--progress', String(Math.min(1, currentTime / duration)));
  };

  const onPlaying = () => {
    showCount(true);
    paint();
  };

  const onHide = () => showCount(false);

  const onLoadStart = () => {
    showCount(false);
    nav.current?.style.setProperty('--progress', '0');
  };

  const onEnded = () => {
    const next = active + 1;
    if (next >= videos.length) return;

    setActive(next);
  };

  const select = (index: number) => {
    if (index === active) return;

    setActive(index);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const position = tabs.findIndex((tab) => tab === document.activeElement);
    if (position < 0) return;

    const targets: Record<string, number> = {
      ArrowRight: (position + 1) % tabs.length,
      ArrowLeft: (position - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    };
    const target = targets[event.key];
    if (target === undefined) return;

    event.preventDefault();
    tabs[target].focus();
  };

  return (
    <div className="hero-videos flex flex-col gap-3" ref={root}>
      <div
        className="relative aspect-video w-full overflow-hidden rounded-md border border-line-strong bg-mint shadow-md max-md:data-[mobile=yes]:mx-auto max-md:data-[mobile=yes]:aspect-[9/16] max-md:data-[mobile=yes]:w-[min(100%,22rem)]"
        data-mobile={wide === false && current.mobile ? 'yes' : 'no'}
        role="tabpanel"
        id={PANEL_ID}
        aria-labelledby={tabId(current.id)}
      >
        <video
          className="block h-full w-full object-contain"
          ref={video}
          controls
          playsInline
          autoPlay={!reducedMotion}
          preload="none"
          poster={file.poster}
          src={source}
          aria-label={`${current.title} video`}
          onPlaying={onPlaying}
          onPause={onHide}
          onEmptied={onHide}
          onLoadStart={onLoadStart}
          onTimeUpdate={paint}
          onEnded={onEnded}
        >
          <p>
            Your browser cannot play this video. <a href={current.landscape.src}>Download it (MP4)</a>.
          </p>
        </video>
        <span
          className="hero-videos__count pointer-events-none absolute top-2 right-2 min-w-7 rounded-sm bg-black/50 px-[0.4rem] py-[0.1rem] text-center font-mono text-xs leading-[1.4] font-semibold text-white tabular-nums"
          ref={count}
          hidden
          aria-hidden="true"
        />
      </div>

      <div
        className="hero-videos__nav grid gap-4 [--progress:0]"
        role="tablist"
        aria-label="Videos"
        ref={nav}
        onKeyDown={onKeyDown}
        style={{ gridTemplateColumns: `repeat(${videos.length}, minmax(0, 1fr))` }}
      >
        {videos.map((item, index) => {
          const selected = index === active;

          return (
            <button
              type="button"
              role="tab"
              key={item.id}
              id={tabId(item.id)}
              className="group relative flex cursor-pointer flex-col gap-0.5 border-x-0 border-t-2 border-b-0 border-line bg-transparent px-0 pt-2 pb-0 text-left font-sans text-base font-normal text-text-muted hover:text-text aria-selected:text-text"
              aria-selected={selected}
              aria-controls={PANEL_ID}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(index)}
            >
              <span className="flex flex-wrap items-baseline gap-2">
                <span className="font-mono text-xs leading-[normal] font-bold group-aria-selected:text-primary">{String(index + 1).padStart(2, '0')}</span>
                <span className="font-bold">{item.title}</span>
              </span>
              <span className="text-sm">{item.summary}</span>
              <span
                className="absolute -top-0.5 right-0 left-0 hidden h-0.5 origin-left scale-x-[var(--progress)] bg-primary group-aria-selected:block"
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
