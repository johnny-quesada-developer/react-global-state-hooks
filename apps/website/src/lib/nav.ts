import { links, withBase } from './site';

/** Primary destinations, shared by the header, the mobile drawer and the footer. */
export const primaryNav = [
  { label: 'Docs', href: withBase('docs/'), match: withBase('docs/') },
  { label: 'Examples', href: withBase('examples/'), match: withBase('examples/') },
  { label: 'DevTools', href: withBase('agentic-devtools/'), match: withBase('agentic-devtools/') },
  { label: 'About', href: withBase('about/'), match: withBase('about/') },
] as const;

export const drawerNav = [
  { label: 'Home', href: withBase() },
  { label: 'Documentation', href: withBase('docs/') },
  { label: 'Examples', href: withBase('examples/') },
  { label: 'Agentic DevTools', href: withBase('agentic-devtools/') },
  { label: 'About Johnny', href: withBase('about/') },
  { label: 'easy-code-review', href: withBase('easy-code-review/') },
] as const;

export const footerNav = [
  {
    title: 'Build',
    links: [
      { label: 'Getting started', href: withBase('docs/getting-started/') },
      { label: 'Documentation', href: withBase('docs/') },
      { label: 'Examples', href: withBase('examples/') },
      { label: 'Platform & versions', href: withBase('docs/platform-and-versions/') },
    ],
  },
  {
    title: 'Explore',
    links: [
      { label: 'Agentic DevTools', href: withBase('agentic-devtools/') },
      { label: 'About the author', href: withBase('about/') },
      { label: 'easy-code-review', href: withBase('easy-code-review/') },
      { label: 'Report an issue', href: `${links.repo}/issues`, external: true },
    ],
  },
  {
    title: 'Open source',
    links: [
      { label: 'GitHub', href: links.repo, external: true },
      { label: 'npm', href: links.npm, external: true },
      { label: 'MIT license', href: `${links.repo}/blob/master/LICENSE`, external: true },
    ],
  },
] as const;

export const isActive = (pathname: string, match: string) => pathname.startsWith(match);
