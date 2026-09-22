import type { ReactNode } from 'react';
import { withBase } from '../lib/site';
import { DocsNav, type NavGroup, type NavPage } from './DocsNav';

export interface TocHeading {
  depth: number;
  slug: string;
  text: string;
}

interface DocsPageProps {
  id: string;
  title: string;
  description: string;
  section: string;
  status: 'stable' | 'beta';
  sections: NavGroup[];
  headings: TocHeading[];
  previous?: NavPage;
  next?: NavPage;
  /** The rendered MDX body. */
  children: ReactNode;
}

export function DocsPage({
  id,
  title,
  description,
  section,
  status,
  sections,
  headings,
  previous,
  next,
  children,
}: DocsPageProps) {
  const toc = headings.filter((heading) => heading.depth === 2 || heading.depth === 3);

  return (
    <div className="container docs">
      <details className="docs__mobile-nav">
        <summary>Documentation menu</summary>
        <DocsNav sections={sections} currentId={id} />
      </details>

      <aside className="docs__sidebar">
        <DocsNav sections={sections} currentId={id} />
      </aside>

      <article className="docs__content" data-pagefind-body>
        <header className="docs__header">
          <p className="docs__section" data-pagefind-ignore>
            {section}
            {status === 'beta' && <span className="badge badge--beta">Beta</span>}
          </p>
          <h1>{title}</h1>
          <p className="docs__lede">{description}</p>
        </header>

        <div className="prose">{children}</div>

        <nav className="docs__pager" aria-label="Previous and next pages" data-pagefind-ignore>
          {previous ? (
            <a className="docs__pager-link" rel="prev" href={withBase(`docs/${previous.id}/`)}>
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
              href={withBase(`docs/${next.id}/`)}
            >
              <span>Next</span>
              {next.title}
            </a>
          )}
        </nav>
      </article>

      {toc.length > 0 && (
        <aside className="docs__toc" data-pagefind-ignore>
          <nav aria-label="On this page">
            <p className="docs-nav__title">On this page</p>
            <ul>
              {toc.map((heading) => (
                <li className={heading.depth === 3 ? 'toc-sub' : undefined} key={heading.slug}>
                  <a href={`#${heading.slug}`}>{heading.text}</a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      )}
    </div>
  );
}
