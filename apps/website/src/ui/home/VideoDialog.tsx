import { useEffect, useRef, useState, type ReactNode } from 'react';
import { heroVideos, type HeroVideo } from '../../data/heroVideos';
import { Icon } from '../Icon';

interface WatchVideoProps {
  /** Which recordings the dialog offers; the first is selected. */
  ids: string[];
  /** The trigger, rendered as given (a button or a card). */
  children: ReactNode;
  className?: string;
  title?: string;
}

const WIDE = '(min-width: 48rem)';

/**
 * Optional proof recordings: the video is only given a source when the dialog opens, so nothing downloads
 * on page load. Native controls, no autoplay sound, one player at a time.
 */
export function WatchVideo({ ids, children, className, title }: WatchVideoProps) {
  const videos = ids.map((id) => heroVideos.find((video) => video.id === id)).filter(Boolean) as HeroVideo[];
  const dialog = useRef<HTMLDialogElement>(null);
  const player = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [wide, setWide] = useState(true);

  useEffect(() => {
    const query = window.matchMedia(WIDE);
    const choose = () => setWide(query.matches);
    choose();
    query.addEventListener('change', choose);
    return () => query.removeEventListener('change', choose);
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) player.current?.pause();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const current = videos[active];
  const file = !wide && current?.mobile ? current.mobile : current?.landscape;

  const show = () => {
    setOpen(true);
    dialog.current?.showModal();
  };

  const onClose = () => {
    player.current?.pause();
    setOpen(false);
  };

  const onBackdrop = (event: React.MouseEvent<HTMLDialogElement>) => {
    const element = dialog.current;
    if (!element || event.target !== element) return;
    const rect = element.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) element.close();
  };

  return (
    <>
      <button type="button" className={className} onClick={show}>
        {children}
      </button>
      <dialog className="w-[min(980px,calc(100%-32px))] p-0" ref={dialog} aria-labelledby="video-title" onClose={onClose} onClick={onBackdrop}>
        <div className="flex items-center justify-between px-[19px] py-3 text-12 max-sm:text-11">
          <span id="video-title">{title ?? `react-global-state-hooks · ${current?.title}`}</span>
          <button type="button" className="inline-flex size-[34px] items-center justify-center rounded-[5px] text-muted hover:bg-[#eef1ed] hover:text-ink" aria-label="Close video" onClick={() => dialog.current?.close()}>
            <Icon name="close" />
          </button>
        </div>
        {current && (
          <video
            className={`block w-full bg-[#192016] ${!wide && current.mobile ? 'mx-auto aspect-[9/16] max-h-[70vh]' : 'aspect-video'}`}
            ref={player}
            controls
            playsInline
            preload="none"
            poster={file?.poster}
            src={open ? file?.src : undefined}
            aria-label={`${current.title} video`}
            key={`${current.id}-${wide}`}
          >
            <p>
              Your browser cannot play this video. <a href={current.landscape.src}>Download it (MP4)</a>.
            </p>
          </video>
        )}
        <p className="m-0 px-[19px] py-[13px] text-11 text-muted">
          {videos.length > 1 && (
            <span className="mr-3 inline-flex flex-wrap gap-3" role="group" aria-label="Recordings">
              {videos.map((video, index) => (
                <button
                  type="button"
                  className={`underline underline-offset-[3px] ${index === active ? 'text-green' : ''}`}
                  aria-pressed={index === active}
                  key={video.id}
                  onClick={() => {
                    player.current?.pause();
                    setActive(index);
                  }}
                >
                  {video.title}
                </button>
              ))}
            </span>
          )}
          {current?.summary}. Recorded against this repository's playground; loads only when opened.{' '}
          {current && (
            <a className="underline underline-offset-[3px]" href={current.landscape.src} target="_blank" rel="noopener noreferrer">
              Open the video ↗
            </a>
          )}
        </p>
      </dialog>
    </>
  );
}
