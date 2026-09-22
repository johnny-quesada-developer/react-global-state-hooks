import { Profiler } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HeroVideos } from './HeroVideos';
import { usePreferences } from '../state/preferences';

const videos = [
  {
    id: 'one',
    title: 'One',
    summary: 'First',
    landscape: { src: '/one.mp4', poster: '/one.jpg' },
    mobile: { src: '/one-m.mp4', poster: '/one-m.jpg' },
  },
  { id: 'two', title: 'Two', summary: 'Second', landscape: { src: '/two.mp4', poster: '/two.jpg' } },
  { id: 'three', title: 'Three', summary: 'Third', landscape: { src: '/three.mp4', poster: '/three.jpg' } },
];

let allowSound = true;
let playCalls: Array<{ src: string; muted: boolean }> = [];

const setMatches = (matches: Record<string, boolean>) => {
  window.matchMedia = ((query: string) => ({
    matches: matches[query] ?? false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
};

const flush = () => act(async () => {});

const videoElement = () => document.querySelector('video') as HTMLVideoElement;

const mockTiming = (element: HTMLVideoElement, duration: number, currentTime: number) => {
  Object.defineProperty(element, 'duration', { configurable: true, value: duration });
  Object.defineProperty(element, 'currentTime', { configurable: true, writable: true, value: currentTime });
};

beforeEach(() => {
  window.localStorage.clear();
  window.location.hash = '';
  allowSound = true;
  playCalls = [];
  setMatches({ '(min-width: 48rem)': true });
  Element.prototype.scrollIntoView = vi.fn();

  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
    playCalls.push({ src: this.getAttribute('src') ?? '', muted: this.muted });

    return !this.muted && !allowSound
      ? Promise.reject(new DOMException('blocked', 'NotAllowedError'))
      : Promise.resolve();
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  usePreferences.reset(
    { packageManager: 'npm', miniMeHidden: false, heroSoundOffered: false, heroSound: null },
    {},
  );
});

describe('HeroVideos', () => {
  it('names every video and marks the first as current', () => {
    render(<HeroVideos videos={videos} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['01OneFirst', '02TwoSecond', '03ThreeThird']);
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
  });

  it('renders no source on the server-rendered markup so nothing downloads before playback', () => {
    setMatches({});
    const { container } = render(<HeroVideos videos={videos} />);

    expect(container.querySelector('video')?.getAttribute('preload')).toBe('none');
  });

  it('starts the first video by itself and falls back to muted when sound is blocked', async () => {
    allowSound = false;
    render(<HeroVideos videos={videos} />);
    await flush();

    expect(videoElement().getAttribute('src')).toBe('/one.mp4');
    expect(playCalls.map((call) => call.muted)).toEqual([false, true]);
    expect(videoElement().muted).toBe(true);
    expect(usePreferences.getState().heroSoundOffered).toBe(false);
  });

  it('plays the first video with sound once, records it, and mutes the video that follows', async () => {
    render(<HeroVideos videos={videos} />);
    await flush();

    expect(playCalls).toEqual([{ src: '/one.mp4', muted: false }]);
    expect(usePreferences.getState().heroSoundOffered).toBe(true);

    fireEvent.ended(videoElement());
    await flush();

    expect(videoElement().getAttribute('src')).toBe('/two.mp4');
    expect(videoElement().muted).toBe(true);
    expect(playCalls.at(-1)).toEqual({ src: '/two.mp4', muted: true });
  });

  it('starts muted on a later visit', async () => {
    usePreferences.setState((state) => ({ ...state, heroSoundOffered: true }));
    render(<HeroVideos videos={videos} />);
    await flush();

    expect(playCalls).toEqual([{ src: '/one.mp4', muted: true }]);
  });

  it('does not autoplay when the visitor prefers reduced motion', async () => {
    setMatches({ '(min-width: 48rem)': true, '(prefers-reduced-motion: reduce)': true });
    render(<HeroVideos videos={videos} />);
    await flush();

    expect(playCalls).toEqual([]);
  });

  it('advances through the list, and stops after the last video', async () => {
    usePreferences.setState((state) => ({ ...state, heroSoundOffered: true }));
    render(<HeroVideos videos={videos} />);
    await flush();

    fireEvent.ended(videoElement());
    await flush();
    fireEvent.ended(videoElement());
    await flush();

    expect(videoElement().getAttribute('src')).toBe('/three.mp4');
    expect(screen.getByRole('tab', { name: /Three/ }).getAttribute('aria-selected')).toBe('true');

    const calls = playCalls.length;
    fireEvent.ended(videoElement());
    await flush();

    expect(playCalls.length).toBe(calls);
    expect(videoElement().getAttribute('src')).toBe('/three.mp4');
  });

  it('switches on click and plays the chosen video, but leaves the current one alone when clicked again', async () => {
    usePreferences.setState((state) => ({ ...state, heroSoundOffered: true }));
    render(<HeroVideos videos={videos} />);
    await flush();

    fireEvent.click(screen.getByRole('tab', { name: /Two/ }));
    await flush();

    expect(videoElement().getAttribute('src')).toBe('/two.mp4');
    expect(playCalls.at(-1)?.src).toBe('/two.mp4');

    const calls = playCalls.length;
    fireEvent.click(screen.getByRole('tab', { name: /Two/ }));
    await flush();

    expect(playCalls.length).toBe(calls);
  });

  it('remembers when the visitor turns sound on, and keeps it on for the next video', async () => {
    usePreferences.setState((state) => ({ ...state, heroSoundOffered: true }));
    render(<HeroVideos videos={videos} />);
    await flush();

    videoElement().muted = false;
    fireEvent.volumeChange(videoElement());

    expect(usePreferences.getState().heroSound).toBe('on');

    fireEvent.ended(videoElement());
    await flush();

    expect(videoElement().muted).toBe(false);
    expect(playCalls.at(-1)).toEqual({ src: '/two.mp4', muted: false });
  });

  it('tries sound again on a later visit after the visitor turned it on', async () => {
    usePreferences.setState((state) => ({ ...state, heroSoundOffered: true, heroSound: 'on' }));
    render(<HeroVideos videos={videos} />);
    await flush();

    expect(playCalls).toEqual([{ src: '/one.mp4', muted: false }]);
  });

  it('falls back to muted playback without forgetting the choice when the browser blocks sound', async () => {
    allowSound = false;
    usePreferences.setState((state) => ({ ...state, heroSoundOffered: true, heroSound: 'on' }));
    render(<HeroVideos videos={videos} />);
    await flush();
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));

    expect(playCalls.map((call) => call.muted)).toEqual([false, true]);
    expect(usePreferences.getState().heroSound).toBe('on');
  });

  it('stays muted for good when the visitor muted it, even on a first visit', async () => {
    usePreferences.setState((state) => ({ ...state, heroSound: 'off' }));
    render(<HeroVideos videos={videos} />);
    await flush();

    expect(playCalls).toEqual([{ src: '/one.mp4', muted: true }]);

    videoElement().muted = false;
    fireEvent.volumeChange(videoElement());
    expect(usePreferences.getState().heroSound).toBe('on');

    videoElement().muted = true;
    fireEvent.volumeChange(videoElement());
    expect(usePreferences.getState().heroSound).toBe('off');
  });

  it('shows the seconds left and the progress without rendering again', async () => {
    let commits = 0;
    render(
      <Profiler id="hero" onRender={() => (commits += 1)}>
        <HeroVideos videos={videos} />
      </Profiler>,
    );
    await flush();

    const element = videoElement();
    const label = document.querySelector('.hero-videos__count') as HTMLElement;
    const nav = document.querySelector('.hero-videos__nav') as HTMLElement;
    fireEvent.playing(element);
    const before = commits;

    for (const time of [0, 1.2, 2.5, 30, 59.6]) {
      mockTiming(element, 60, time);
      fireEvent.timeUpdate(element);
    }

    expect(label.hidden).toBe(false);
    expect(label.textContent).toBe('1');
    expect(nav.style.getPropertyValue('--progress')).toBe(String(59.6 / 60));
    expect(commits).toBe(before);

    fireEvent.pause(element);
    expect(label.hidden).toBe(true);
  });

  it('starts the countdown at the full length', async () => {
    render(<HeroVideos videos={videos} />);
    await flush();

    mockTiming(videoElement(), 60, 0);
    fireEvent.playing(videoElement());

    expect(document.querySelector('.hero-videos__count')?.textContent).toBe('60');
  });

  it('moves focus with the arrow keys and selects with Enter or a click', async () => {
    render(<HeroVideos videos={videos} />);
    await flush();

    const [first, second, third] = screen.getAllByRole('tab');
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(second);

    fireEvent.keyDown(second, { key: 'End' });
    expect(document.activeElement).toBe(third);

    fireEvent.keyDown(third, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(first, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(third);
  });

  it('opens the video named in the address when a watch link is followed', async () => {
    render(<HeroVideos videos={videos} />);
    await flush();

    window.location.hash = '#watch-two';
    fireEvent(window, new HashChangeEvent('hashchange'));
    await flush();

    expect(videoElement().getAttribute('src')).toBe('/two.mp4');
    expect(screen.getByRole('tab', { name: /Two/ }).getAttribute('aria-selected')).toBe('true');
  });

  it('uses the portrait file below the desktop width when one exists', async () => {
    setMatches({});
    render(<HeroVideos videos={videos} />);
    await flush();

    expect(videoElement().getAttribute('src')).toBe('/one-m.mp4');

    fireEvent.click(screen.getByRole('tab', { name: /Two/ }));
    await flush();

    expect(videoElement().getAttribute('src')).toBe('/two.mp4');
  });

  it('switches to the right file and resumes when the viewport crosses the breakpoint mid-playback', async () => {
    let matches = false;
    let onChange: (() => void) | undefined;
    window.matchMedia = ((query: string) => ({
      get matches() {
        return matches;
      },
      media: query,
      addEventListener: (_: string, handler: () => void) => {
        onChange = handler;
      },
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;

    render(<HeroVideos videos={videos} />);
    await flush();

    expect(videoElement().getAttribute('src')).toBe('/one-m.mp4');
    fireEvent.play(videoElement());

    matches = true;
    onChange?.();
    await flush();

    expect(videoElement().getAttribute('src')).toBe('/one.mp4');
    expect(playCalls.at(-1)?.src).toBe('/one.mp4');
  });
});
