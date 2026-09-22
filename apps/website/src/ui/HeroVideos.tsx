import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { heroVideos } from '../data/heroVideos';
import type { HeroVideo } from '../data/heroVideos';
import { usePreferences } from '../state/preferences';

const WIDE = '(min-width: 48rem)';
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const WATCH_HASH = /^#watch-(.+)$/;
const PANEL_ID = 'hero-video-panel';

type PlayMode = 'first' | 'advance' | 'keep';

const tabId = (id: string) => `hero-video-tab-${id}`;

const play = (element: HTMLVideoElement): Promise<boolean> => {
  try {
    return Promise.resolve(element.play()).then(
      () => true,
      () => false,
    );
  } catch {
    return Promise.resolve(false);
  }
};

interface HeroVideosProps {
  videos?: readonly HeroVideo[];
}

export function HeroVideos({ videos = heroVideos }: HeroVideosProps) {
  const [active, setActive] = useState(0);
  const [wide, setWide] = useState<boolean | null>(null);

  const video = useRef<HTMLVideoElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const nav = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const pending = useRef<PlayMode | null>('first');
  const started = useRef(false);
  const programmatic = useRef(0);
  const activeRef = useRef(active);
  activeRef.current = active;

  const current = videos[active];
  const file = wide === false && current.mobile ? current.mobile : current.landscape;
  const source = wide === null ? undefined : file.src;

  const setMuted = useCallback((muted: boolean) => {
    const element = video.current;
    if (!element || element.muted === muted) return;

    programmatic.current += 1;
    element.muted = muted;
  }, []);

  const start = useCallback(
    async (mode: PlayMode) => {
      const element = video.current;
      if (!element) return;

      const { heroSound, heroSoundOffered } = usePreferences.getState();
      const wantsSound =
        mode === 'first'
          ? heroSound === 'on' || (heroSound === null && !heroSoundOffered)
          : mode === 'advance'
            ? heroSound === 'on'
            : !element.muted;

      if (wantsSound) {
        setMuted(false);

        if (await play(element)) {
          if (mode === 'first') usePreferences.setState((state) => ({ ...state, heroSoundOffered: true }));

          return;
        }
      }

      setMuted(true);
      await play(element);
    },
    [setMuted],
  );

  useEffect(() => {
    if (window.matchMedia(REDUCED_MOTION).matches) pending.current = null;

    const query = window.matchMedia(WIDE);
    const choose = () => setWide(query.matches);

    query.addEventListener('change', choose);
    choose();

    return () => query.removeEventListener('change', choose);
  }, []);

  useEffect(() => {
    if (!source) return;

    if (pending.current !== null) {
      const mode = pending.current;
      pending.current = null;
      void start(mode);

      return;
    }

    // The viewport crossed the landscape/portrait breakpoint mid-session (resize, rotation): the
    // landscape/mobile file just changed under an already-playing video. Resume in the right file,
    // keeping whatever mute state the visitor already has.
    if (started.current) void start('keep');
  }, [source, start]);

  useEffect(() => {
    const go = (initial: boolean) => {
      const id = WATCH_HASH.exec(window.location.hash)?.[1];
      const index = videos.findIndex((item) => item.id === id);
      if (index < 0) return;

      if (!initial) root.current?.scrollIntoView({ block: 'center' });

      if (index === activeRef.current) {
        if (!initial) void start('keep');

        return;
      }

      pending.current = initial ? (pending.current === null ? null : 'advance') : 'keep';
      setActive(index);
    };

    const onHashChange = () => go(false);

    go(true);
    window.addEventListener('hashchange', onHashChange);

    return () => window.removeEventListener('hashchange', onHashChange);
  }, [videos, start]);

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

  const onVolumeChange = () => {
    const element = video.current;
    if (!element) return;

    if (programmatic.current > 0) {
      programmatic.current -= 1;

      return;
    }

    const heroSound = !element.muted && element.volume > 0 ? 'on' : 'off';
    usePreferences.setState((state) => ({ ...state, heroSound }));
  };

  const onEnded = () => {
    const next = active + 1;
    if (next >= videos.length) return;

    pending.current = 'advance';
    setActive(next);
  };

  const select = (index: number) => {
    const element = video.current;

    if (index === active) {
      if (element?.ended) {
        element.currentTime = 0;
        void start('keep');
      }

      return;
    }

    pending.current = 'keep';
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
    <div className="hero-videos" ref={root}>
      <div
        className="hero-videos__frame"
        data-mobile={current.mobile ? 'yes' : 'no'}
        role="tabpanel"
        id={PANEL_ID}
        aria-labelledby={tabId(current.id)}
      >
        <video
          ref={video}
          controls
          playsInline
          preload="none"
          poster={file.poster}
          src={source}
          aria-label={`${current.title} video`}
          onPlay={() => {
            started.current = true;
          }}
          onPlaying={onPlaying}
          onPause={onHide}
          onEmptied={onHide}
          onLoadStart={onLoadStart}
          onTimeUpdate={paint}
          onVolumeChange={onVolumeChange}
          onEnded={onEnded}
        >
          <p>
            Your browser cannot play this video. <a href={current.landscape.src}>Download it (MP4)</a>.
          </p>
        </video>
        <span className="hero-videos__count" ref={count} hidden aria-hidden="true" />
      </div>

      <div
        className="hero-videos__nav"
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
              className="hero-videos__tab"
              aria-selected={selected}
              aria-controls={PANEL_ID}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(index)}
            >
              <span className="hero-videos__head">
                <span className="hero-videos__index">{String(index + 1).padStart(2, '0')}</span>
                <span className="hero-videos__title">{item.title}</span>
              </span>
              <span className="hero-videos__summary">{item.summary}</span>
              <span className="hero-videos__bar" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
