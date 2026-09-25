import type { ReactNode } from 'react';
import { Badge } from './Badge';
import { PageHeader } from './PageHeader';
import { PageShell } from './PageShell';
import { Pager, PagerLink } from './Pager';
import { withBase } from '../lib/site';
import { DocsNav, navLink, navTitle, type NavGroup, type NavPage } from './DocsNav';

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
    <PageShell className="grid grid-cols-[minmax(0,1fr)] gap-6 py-6 wider:grid-cols-[14rem_minmax(0,1fr)] wider:gap-8 widest:grid-cols-[14rem_minmax(0,1fr)_13rem]">
      <details className="rounded-md border border-line-strong px-4 py-2 wider:hidden">
        <summary className="cursor-pointer font-semibold">Documentation menu</summary>
        <DocsNav sections={sections} currentId={id} />
      </details>

      <aside className="hidden wider:sticky wider:top-[calc(var(--header-height)+1rem)] wider:block wider:max-h-[calc(100vh-var(--header-height)-2rem)] wider:self-start wider:overflow-y-auto">
        <DocsNav sections={sections} currentId={id} />
      </aside>

      <article data-pagefind-body>
        <PageHeader title={title} description={description}>
          <p className="m-0 mb-2 text-sm font-bold text-primary" data-pagefind-ignore>
            {section}
            {status === 'beta' && <Badge>Beta</Badge>}
          </p>
        </PageHeader>

        <div className="prose">{children}</div>

        <Pager aria-label="Previous and next pages">
          {previous ? (
            <PagerLink direction="previous" title={previous.title} href={withBase(`docs/${previous.id}/`)} />
          ) : (
            <span />
          )}
          {next && <PagerLink direction="next" title={next.title} href={withBase(`docs/${next.id}/`)} />}
        </Pager>
      </article>

      {toc.length > 0 && (
        <aside className="hidden widest:sticky widest:top-[calc(var(--header-height)+1rem)] widest:block widest:max-h-[calc(100vh-var(--header-height)-2rem)] widest:self-start widest:overflow-y-auto" data-pagefind-ignore>
          <nav aria-label="On this page">
            <p className={navTitle}>On this page</p>
            <ul className="m-0 list-none p-0">
              {toc.map((heading) => (
                <li key={heading.slug}>
                  <a className={`${navLink} ${heading.depth === 3 ? 'pl-6' : ''}`} href={`#${heading.slug}`}>
                    {heading.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      )}
    </PageShell>
  );
}
