import type { ReactNode } from 'react';
import { PageHeader } from './PageHeader';
import { PageShell } from './PageShell';
import { Pager, PagerLink } from './Pager';
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
    <PageShell className="pt-6 pb-0" data-pagefind-body>
      <p className="mt-0 mr-0 mb-2 ml-0 text-sm font-bold" data-pagefind-ignore>
        <a href={withBase('examples/')}>Examples</a>
      </p>
      <PageHeader title={title} description={description} />

      <div className="prose max-w-none">{children}</div>

      {related.length > 0 && (
        <section className="mt-12" data-pagefind-ignore>
          <h2 className="mb-3 text-xl leading-heading">Related documentation</h2>
          <ul className="m-0 pl-[1.2rem]">
            {related.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Pager aria-label="Previous and next examples">
        {previous ? (
          <PagerLink direction="previous" title={previous.title} href={withBase(`examples/${previous.id}/`)} />
        ) : (
          <span />
        )}
        {next && <PagerLink direction="next" title={next.title} href={withBase(`examples/${next.id}/`)} />}
      </Pager>
    </PageShell>
  );
}
