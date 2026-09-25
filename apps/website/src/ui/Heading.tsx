import type { ReactNode } from 'react';

interface HeadingProps {
  id?: string;
  children: ReactNode;
}

function makeHeading(Tag: 'h2' | 'h3') {
  // Replaces h2/h3 in MDX so every heading gets a visible, focusable anchor link.
  return function Heading({ id, children }: HeadingProps) {
    return (
      <Tag id={id} className="group relative">
        {children}
        {id && (
          <a
            className="ml-[0.4em] font-normal text-text-muted no-underline opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100 focus-visible:opacity-100 hover-none:opacity-60"
            href={`#${id}`}
            aria-label="Link to this section"
          >
            #
          </a>
        )}
      </Tag>
    );
  };
}

export const H2 = makeHeading('h2');
export const H3 = makeHeading('h3');
