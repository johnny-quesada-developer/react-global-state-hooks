import type { ReactNode } from 'react';

interface HeadingProps {
  id?: string;
  children: ReactNode;
}

function makeHeading(Tag: 'h2' | 'h3') {
  // Replaces h2/h3 in MDX so every heading gets a visible, focusable anchor link.
  return function Heading({ id, children }: HeadingProps) {
    return (
      <Tag id={id} className="heading">
        {children}
        {id && (
          <a className="heading__anchor" href={`#${id}`} aria-label="Link to this section">
            #
          </a>
        )}
      </Tag>
    );
  };
}

export const H2 = makeHeading('h2');
export const H3 = makeHeading('h3');
