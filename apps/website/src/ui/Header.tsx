import type { ReactNode } from 'react';
import { links, withBase } from '../lib/site';

interface HeaderProps {
  pathname: string;
  /** Interactive island(s) rendered at the end of the bar (the search button). */
  children?: ReactNode;
}

export function Header({ pathname, children }: HeaderProps) {
  const docs = withBase('docs/');

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <a className="brand" href={withBase()} aria-label="react-global-state-hooks, home">
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
          <span className="brand__name">react-global-state-hooks</span>
        </a>

        <nav className="site-nav" aria-label="Main">
          <a href={docs} aria-current={pathname.startsWith(docs) ? 'page' : undefined}>
            Docs
          </a>
          <a href={links.repo} rel="noopener">
            GitHub
          </a>
        </nav>

        {children}
      </div>
    </header>
  );
}
