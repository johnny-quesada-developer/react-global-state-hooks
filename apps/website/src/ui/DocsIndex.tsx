import { withBase } from '../lib/site';
import { PageShell } from './PageShell';

export interface IndexPage {
  id: string;
  title: string;
  description: string;
}

export interface IndexSection {
  title: string;
  pages: IndexPage[];
}

export function DocsIndex({ sections }: { sections: IndexSection[] }) {
  return (
    <PageShell className="py-8">
      <h1 className="text-3xl leading-heading">Documentation</h1>
      <p className="mt-2 text-lg text-text-muted">Task-oriented guides for react-global-state-hooks. Start with Getting started.</p>

      <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4">
        {sections.map((section) => (
          <section className="rounded-md bg-mint px-6 py-4" key={section.title}>
            <h2 className="mb-3 text-xl leading-heading">{section.title}</h2>
            <ul className="m-0 list-none p-0">
              {section.pages.map((page) => (
                <li key={page.id}>
                  <a className="block font-bold" href={withBase(`docs/${page.id}/`)}>
                    {page.title}
                  </a>
                  <span className="block text-sm text-text-muted">{page.description}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
