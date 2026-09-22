import { Profiler } from 'react';
import { renderToString } from 'react-dom/server';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HeroVideos } from './HeroVideos';

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

let playCalls: string[] = [];

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
  window.location.hash = '';
  playCalls = [];
  setMatches({ '(min-width: 48rem)': true });
  Element.prototype.scrollIntoView = vi.fn();

  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
    playCalls.push(this.getAttribute('src') ?? '');

    return Promise.resolve();
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('HeroVideos', () => {
  it('names every video and marks the first as current', async () => {
    render(<HeroVideos videos={videos} />);
    await flush();

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['01OneFirst', '02TwoSecond', '03ThreeThird']);
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
  });

  it('renders no source on the server-rendered markup so nothing downloads before playback', () => {
    const markup = renderToString(<HeroVideos videos={videos} />);
    const container = document.createElement('div');
    container.innerHTML = markup;
    const video = container.querySelector('video');

    expect(video).not.toBeNull();
    expect(video?.getAttribute('preload')).toBe('none');
    expect(video?.hasAttribute('src')).toBe(false);
    expect(container.querySelector('source')).toBeNull();
  });

  it('lets the browser autoplay the first video by default', async () => {
    render(<HeroVideos videos={videos} />);
    await flush();

    expect(videoElement().getAttribute('src')).toBe('/one.mp4');
    expect(videoElement().autoplay).toBe(true);
  });

  it('does not autoplay when the visitor prefers reduced motion', async () => {
    setMatches({ '(min-width: 48rem)': true, '(prefers-reduced-motion: reduce)': true });
    render(<HeroVideos videos={videos} />);
    await flush();

    expect(videoElement().autoplay).toBe(false);
  });

  it('advances through the list, and stops after the last video', async () => {
    render(<HeroVideos videos={videos} />);
    await flush();

    fireEvent.ended(videoElement());
    await flush();
    fireEvent.ended(videoElement());
    await flush();

    expect(videoElement().getAttribute('src')).toBe('/three.mp4');
    expect(screen.getByRole('tab', { name: /Three/ }).getAttribute('aria-selected')).toBe('true');

    fireEvent.ended(videoElement());
    await flush();

    expect(videoElement().getAttribute('src')).toBe('/three.mp4');
  });

  it('switches on click, but leaves the current one alone when clicked again', async () => {
    render(<HeroVideos videos={videos} />);
    await flush();

    fireEvent.click(screen.getByRole('tab', { name: /Two/ }));
    await flush();

    expect(videoElement().getAttribute('src')).toBe('/two.mp4');
    expect(screen.getByRole('tab', { name: /Two/ }).getAttribute('aria-selected')).toBe('true');

    fireEvent.click(screen.getByRole('tab', { name: /Two/ }));
    await flush();

    expect(playCalls).toEqual([]);
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

  it('switches to the right file when the viewport crosses the breakpoint mid-playback', async () => {
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

    matches = true;
    await act(async () => onChange?.());

    expect(videoElement().getAttribute('src')).toBe('/one.mp4');
  });
});
