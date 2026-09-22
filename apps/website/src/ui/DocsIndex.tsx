import { withBase } from '../lib/site';

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
    <div className="container docs-index">
      <h1>Documentation</h1>
      <p className="lede">Task-oriented guides for react-global-state-hooks. Start with Getting started.</p>

      <div className="docs-index__grid">
        {sections.map((section) => (
          <section className="docs-index__card" key={section.title}>
            <h2>{section.title}</h2>
            <ul>
              {section.pages.map((page) => (
                <li key={page.id}>
                  <a href={withBase(`docs/${page.id}/`)}>{page.title}</a>
                  <span>{page.description}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
