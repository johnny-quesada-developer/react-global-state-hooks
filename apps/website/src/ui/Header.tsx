import type { ReactNode } from 'react';
import { PageShell } from './PageShell';
import { links, withBase } from '../lib/site';

interface HeaderProps {
  pathname: string;
  /** Interactive island(s) rendered at the end of the bar (the search button). */
  children?: ReactNode;
}

const navLink =
  'border-b-2 border-transparent py-1 text-sm font-semibold text-text no-underline hover:border-primary hover:text-primary aria-[current=page]:border-primary aria-[current=page]:text-primary';

export function Header({ pathname, children }: HeaderProps) {
  const docs = withBase('docs/');
  const examples = withBase('examples/');
  const about = withBase('about/');

  return (
    <header className="sticky top-0 z-20 h-14 border-b border-line bg-bg">
      <PageShell className="flex h-full items-center justify-between gap-4">
        <a
          className="inline-flex min-w-0 items-center gap-2 font-bold text-text no-underline hover:text-text"
          href={withBase()}
          aria-label="react-global-state-hooks, home"
        >
          <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="var(--color-primary)" />
            <circle cx="10" cy="11" r="3" fill="var(--color-yellow)" />
            <circle cx="22" cy="11" r="3" fill="var(--color-mint)" />
            <circle cx="16" cy="22" r="3" fill="var(--color-sky)" />
            <path
              d="M10 11 L22 11 L16 22 Z"
              fill="none"
              stroke="var(--color-on-primary)"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
          <span className="overflow-hidden text-[0.95rem] text-ellipsis whitespace-nowrap max-xs:hidden">
            react-global-state-hooks
          </span>
        </a>

        <nav className="ml-auto flex items-center gap-4" aria-label="Main">
          <a className={navLink} href={docs} aria-current={pathname.startsWith(docs) ? 'page' : undefined}>
            Docs
          </a>
          <a
            className={navLink}
            href={examples}
            aria-current={pathname.startsWith(examples) ? 'page' : undefined}
          >
            Examples
          </a>
          <a className={`${navLink} hidden lg:inline`} href={`${withBase()}#agentic-devtools`}>
            Agentic DevTools
          </a>
          <a className={navLink} href={about} aria-current={pathname.startsWith(about) ? 'page' : undefined}>
            About
          </a>
          <a className={navLink} href={links.repo} rel="noopener">
            GitHub
          </a>
        </nav>

        {children}
      </PageShell>
    </header>
  );
}
