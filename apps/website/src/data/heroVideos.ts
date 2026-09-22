import { withBase } from '../lib/site';

export interface HeroVideoFile {
  src: string;
  poster: string;
}

export interface HeroVideo {
  id: string;
  title: string;
  summary: string;
  landscape: HeroVideoFile;
  mobile?: HeroVideoFile;
}

export const heroVideos: readonly HeroVideo[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    summary: 'Shared state without the ceremony',
    landscape: {
      src: withBase('media/intro.landscape.mp4'),
      poster: withBase('posters/intro.landscape.jpg'),
    },
    mobile: { src: withBase('media/intro.mobile.mp4'), poster: withBase('posters/intro.mobile.jpg') },
  },
  {
    id: 'runtime-debugging',
    title: 'Runtime Debugging',
    summary: 'Give the agent the trace, not a screenshot',
    landscape: {
      src: withBase('media/runtime-debugging.landscape.mp4'),
      poster: withBase('posters/runtime-debugging.landscape.jpg'),
    },
    mobile: {
      src: withBase('media/runtime-debugging.mobile.mp4'),
      poster: withBase('posters/runtime-debugging.mobile.jpg'),
    },
  },
  {
    id: 'verify-the-fix',
    title: 'Verify the Fix',
    summary: 'Test the fix against the running app',
    landscape: {
      src: withBase('media/verify-the-fix.landscape.mp4'),
      poster: withBase('posters/verify-the-fix.landscape.jpg'),
    },
    mobile: {
      src: withBase('media/verify-the-fix.mobile.mp4'),
      poster: withBase('posters/verify-the-fix.mobile.jpg'),
    },
  },
];

export const watchHash = (id: string) => `#watch-${id}`;
