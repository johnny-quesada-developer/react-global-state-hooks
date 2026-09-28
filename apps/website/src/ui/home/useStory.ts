import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../state/motion';

export interface StoryControls {
  step: number;
  playing: boolean;
  /** True once the visitor has taken over: autoplay never resumes. */
  manual: boolean;
  reduced: boolean;
  go: (step: number) => void;
  back: () => void;
  forward: () => void;
}

/**
 * The timeline behind the hero story: it plays on its own while at least 80% of the stage is on
 * screen, holds its place when it scrolls away, loops at the end, and hands control over for good the
 * moment the visitor moves a step themselves. Reduced motion means manual from the start.
 */
export function useStory(durations: readonly number[], stage: React.RefObject<HTMLElement | null>): StoryControls {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [manual, setManual] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visible = useRef(false);
  const current = useRef(0);
  current.current = step;

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const play = useCallback(() => {
    clear();
    setPlaying(true);
    const tick = () => {
      timer.current = setTimeout(() => {
        const next = (current.current + 1) % durations.length;
        setStep(next);
        tick();
      }, durations[current.current]);
    };
    tick();
  }, [durations]);

  const halt = useCallback(() => {
    clear();
    setPlaying(false);
  }, []);

  const take = useCallback(
    (next: number) => {
      clear();
      setManual(true);
      setPlaying(false);
      setStep(((next % durations.length) + durations.length) % durations.length);
    },
    [durations],
  );

  useEffect(() => {
    const element = stage.current;
    if (!element || manual || reduced) return;
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible.current = entry.intersectionRatio >= 0.8;
        if (visible.current && !document.hidden) play();
        else halt();
      },
      { threshold: [0, 0.8] },
    );
    observer.observe(element);

    const onVisibility = () => {
      if (document.hidden) halt();
      else if (visible.current) play();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      clear();
    };
  }, [stage, manual, reduced, play, halt]);

  useEffect(() => {
    if (manual || reduced) halt();
  }, [manual, reduced, halt]);

  return {
    step,
    playing,
    manual,
    reduced,
    go: take,
    back: useCallback(() => take(current.current - 1), [take]),
    forward: useCallback(() => take(current.current + 1), [take]),
  };
}
