import type { ReactNode } from 'react';
import { withBase } from '../lib/site';

export interface ExampleLink {
  id: string;
  title: string;
}

interface ExamplePageProps {
  title: string;
  description: string;
  related: { label: string; href: string }[];
  previous?: ExampleLink;
  next?: ExampleLink;
  children: ReactNode;
}

export function ExamplePage({ title, description, related, previous, next, children }: ExamplePageProps) {
  return (
    <div className="container example" data-pagefind-body>
      <p className="example__crumb" data-pagefind-ignore>
        <a href={withBase('examples/')}>Examples</a>
      </p>
      <header className="docs__header">
        <h1>{title}</h1>
        <p className="docs__lede">{description}</p>
      </header>

      <div className="prose prose--wide">{children}</div>

      {related.length > 0 && (
        <section className="example__related" data-pagefind-ignore>
          <h2>Related documentation</h2>
          <ul>
            {related.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className="docs__pager" aria-label="Previous and next examples" data-pagefind-ignore>
        {previous ? (
          <a className="docs__pager-link" rel="prev" href={withBase(`examples/${previous.id}/`)}>
            <span>Previous</span>
            {previous.title}
          </a>
        ) : (
          <span />
        )}
        {next && (
          <a
            className="docs__pager-link docs__pager-link--next"
            rel="next"
            href={withBase(`examples/${next.id}/`)}
          >
            <span>Next</span>
            {next.title}
          </a>
        )}
      </nav>
    </div>
  );
}
