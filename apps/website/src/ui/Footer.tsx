import type { ReactNode } from 'react';
import { DOCUMENTED_VERSION, links, withBase } from '../lib/site';

interface FooterProps {
  /** The mini-me island, rendered as the last strip of the page. */
  children?: ReactNode;
}

export function Footer({ children }: FooterProps) {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <p>
          react-global-state-hooks by{' '}
          <a href={links.githubProfile} rel="noopener">
            Johnny Quesada
          </a>
          . MIT licensed. Documentation covers version {DOCUMENTED_VERSION}.
        </p>
        <nav aria-label="Footer">
          <a href={withBase('docs/')}>Docs</a>
          <a href={links.repo} rel="noopener">
            GitHub
          </a>
          <a href={links.npm} rel="noopener">
            npm
          </a>
          <a href={links.easyWebWorker} rel="noopener">
            easy-web-worker
          </a>
        </nav>
      </div>
      {children}
    </footer>
  );
}
