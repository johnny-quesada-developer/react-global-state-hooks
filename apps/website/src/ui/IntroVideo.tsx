import { useEffect, useRef, useState } from 'react';
import { withBase } from '../lib/site';

const files = {
  landscape: { src: withBase('media/intro.landscape.mp4'), poster: withBase('posters/intro.landscape.jpg') },
  mobile: { src: withBase('media/intro.mobile.mp4'), poster: withBase('posters/intro.mobile.jpg') },
};

type Variant = keyof typeof files;

// Keep in sync with the (min-width: 48rem) rule in site.css (.intro-video__frame).
const WIDE = '(min-width: 48rem)';

/**
 * One <video>, one source. The variant is chosen in the browser before playback, so the other file is
 * never requested. The server-rendered HTML has no `src` at all, and preload="none" means nothing but the
 * poster downloads until the visitor presses play.
 */
export function IntroVideo() {
  const [variant, setVariant] = useState<Variant | null>(null);
  const started = useRef(false);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const query = window.matchMedia(WIDE);
    const choose = () => {
      // switching source mid-playback would restart the video
      if (started.current) return;
      setVariant(query.matches ? 'landscape' : 'mobile');
    };
    const onPlay = () => {
      started.current = true;
    };

    const element = video.current;
    element?.addEventListener('play', onPlay, { once: true });
    query.addEventListener('change', choose);
    choose();

    return () => {
      element?.removeEventListener('play', onPlay);
      query.removeEventListener('change', choose);
    };
  }, []);

  const current = files[variant ?? 'landscape'];

  return (
    <figure className="intro-video">
      <div className="intro-video__frame">
        <video
          ref={video}
          controls
          playsInline
          preload="none"
          poster={current.poster}
          src={variant ? current.src : undefined}
          aria-label="Introduction to react-global-state-hooks, 60 seconds"
        >
          <p>
            Your browser cannot play this video.{' '}
            <a href={files.landscape.src}>Download the introduction (MP4)</a>.
          </p>
        </video>
      </div>
      <figcaption>60-second introduction</figcaption>
    </figure>
  );
}
