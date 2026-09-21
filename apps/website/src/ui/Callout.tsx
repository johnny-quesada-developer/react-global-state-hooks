import type { ReactNode } from 'react';

const defaultTitles = { note: 'Note', tip: 'Tip', warning: 'Watch out' } as const;

interface CalloutProps {
  type?: keyof typeof defaultTitles;
  title?: string;
  children: ReactNode;
}

export function Callout({ type = 'note', title, children }: CalloutProps) {
  return (
    <aside className={`callout callout--${type}`}>
      <strong className="callout__title">{title ?? defaultTitles[type]}</strong>
      {children}
    </aside>
  );
}
