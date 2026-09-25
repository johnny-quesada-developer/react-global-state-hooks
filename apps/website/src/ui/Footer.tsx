import type { ReactNode } from 'react';
import { PageShell } from './PageShell';
import { PACKAGE_VERSION, links, withBase } from '../lib/site';

interface FooterProps {
  /** The mini-me island, rendered as the last strip of the page. */
  children?: ReactNode;
}

export function Footer({ children }: FooterProps) {
  return (
    <footer className="site-footer mt-18 border-t border-line text-sm text-text-muted">
      <PageShell className="flex flex-wrap justify-between gap-x-6 gap-y-3 py-6">
        <p className="m-0">
          react-global-state-hooks by <a href={withBase('about/')}>Johnny Quesada</a>. MIT licensed.
          Documentation covers version {PACKAGE_VERSION}.
        </p>
        <nav className="flex flex-wrap gap-4" aria-label="Footer">
          <a href={withBase('docs/')}>Docs</a>
          <a href={withBase('examples/')}>Examples</a>
          <a href={withBase('about/')}>About</a>
          <a href={links.repo} rel="noopener">
            GitHub
          </a>
          <a href={links.npm} rel="noopener">
            npm
          </a>
          <a href={withBase('easy-code-review/')}>easy-code-review</a>
          <a href={links.easyWebWorker} rel="noopener">
            easy-web-worker
          </a>
        </nav>
      </PageShell>
      {children}
    </footer>
  );
}
