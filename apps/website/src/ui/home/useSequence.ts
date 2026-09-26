import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../state/motion';

export interface SequenceState {
  index: number;
  running: boolean;
  started: boolean;
  finished: boolean;
}

export interface SequenceControls extends SequenceState {
  reduced: boolean;
  restart: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  toggle: () => void;
  /** Jump to a step without playing (a manual selection cancels autonomous playback). */
  select: (index: number) => void;
  /** Manual advance for reduced motion. */
  next: () => void;
}

/**
 * A small, cancellable timeline (the reference `Sequence` class as a hook). Pausing preserves the time
 * remaining in the current step; hiding the tab or unmounting stops the timer; reduced motion never
 * starts one. `ref` is the element whose visibility gates playback: leaving the viewport pauses.
 */
export function useSequence(durations: readonly number[], ref?: React.RefObject<HTMLElement | null>): SequenceControls {
  const reduced = useReducedMotion();
  const [state, setState] = useState<SequenceState>({ index: 0, running: false, started: false, finished: false });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remaining = useRef(durations[0]);
  const deadline = useRef(0);
  const current = useRef(state);
  current.current = state;

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const queue = useCallback(() => {
    clear();
    deadline.current = performance.now() + remaining.current;
    timer.current = setTimeout(() => {
      const { index } = current.current;
      if (index >= durations.length - 1) {
        remaining.current = 0;
        setState((s) => ({ ...s, running: false, finished: true }));
        return;
      }
      remaining.current = durations[index + 1];
      setState((s) => ({ ...s, index: index + 1 }));
      queue();
    }, remaining.current);
  }, [durations]);

  const restart = useCallback(() => {
    clear();
    remaining.current = durations[0];
    setState({ index: 0, running: true, started: true, finished: false });
    queue();
  }, [durations, queue]);

  const pause = useCallback(() => {
    if (!current.current.running) return;
    remaining.current = Math.max(0, deadline.current - performance.now());
    clear();
    setState((s) => ({ ...s, running: false }));
  }, []);

  const resume = useCallback(() => {
    const { running, started, finished } = current.current;
    if (running) return;
    if (!started || finished) {
      restart();
      return;
    }
    setState((s) => ({ ...s, running: true }));
    queue();
  }, [queue, restart]);

  const stop = useCallback(() => {
    clear();
    remaining.current = durations[0];
    setState({ index: 0, running: false, started: false, finished: false });
  }, [durations]);

  const select = useCallback(
    (index: number) => {
      clear();
      remaining.current = durations[index] ?? durations[0];
      setState({ index, running: false, started: false, finished: false });
    },
    [durations],
  );

  const next = useCallback(() => {
    const index = (current.current.index + 1) % durations.length;
    select(index);
  }, [durations, select]);

  const toggle = useCallback(() => {
    if (current.current.running) pause();
    else resume();
  }, [pause, resume]);

  useEffect(() => {
    if (reduced) pause();
  }, [reduced, pause]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) pause();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', stop);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', stop);
      clear();
    };
  }, [pause, stop]);

  useEffect(() => {
    const element = ref?.current;
    if (!element || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (!entry.isIntersecting) pause();
      },
      { threshold: 0 },
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, [ref, pause]);

  return { ...state, reduced, restart, pause, resume, stop, toggle, select, next };
}

/** Plays a sequence once, the first time its stage is sufficiently visible. */
export function useAutoplayOnce(ref: React.RefObject<HTMLElement | null>, sequence: SequenceControls, threshold = 0.35) {
  const played = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= threshold && !played.current && !sequence.reduced && !document.hidden) {
            played.current = true;
            sequence.restart();
          }
        }
      },
      { threshold: [0, threshold] },
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, [ref, sequence.reduced, sequence.restart, threshold]);
}
