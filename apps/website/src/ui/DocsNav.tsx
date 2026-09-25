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

export const navTitle = 'm-0 mb-2 text-xs font-bold tracking-[0.06em] text-text-muted uppercase';
export const navLink =
  'block border-l-2 border-line px-3 py-1 text-sm text-text no-underline hover:bg-mint aria-[current=page]:border-l-primary aria-[current=page]:bg-mint aria-[current=page]:font-bold';

export function DocsNav({ sections, currentId }: DocsNavProps) {
  return (
    <nav aria-label="Documentation">
      {sections.map((section) => (
        <div className="mt-4 first:mt-0" key={section.title}>
          <p className={navTitle}>{section.title}</p>
          <ul className="m-0 list-none p-0">
            {section.pages.map((page) => (
              <li key={page.id}>
                <a
                  className={navLink}
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
