import { withBase } from '../lib/site';

export interface NavPage {
  id: string;
  title: string;
}

export interface NavGroup {
  title: string;
  pages: NavPage[];
}

interface DocsNavProps {
  sections: NavGroup[];
  currentId?: string;
}

export function DocsNav({ sections, currentId }: DocsNavProps) {
  return (
    <nav aria-label="Documentation">
      {sections.map((section) => (
        <div className="docs-nav__group" key={section.title}>
          <p className="docs-nav__title">{section.title}</p>
          <ul>
            {section.pages.map((page) => (
              <li key={page.id}>
                <a
                  href={withBase(`docs/${page.id}/`)}
                  aria-current={page.id === currentId ? 'page' : undefined}
                >
                  {page.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
