import type { ReactNode } from 'react';

const defaultTitles = { note: 'Note', tip: 'Tip', warning: 'Watch out' } as const;

// Written out per type so Tailwind's scanner sees each full class name.
const tone = {
  note: 'border-[#c3dfef] bg-sky',
  tip: 'border-[#c2dfcb] bg-mint',
  warning: 'border-[#ecd98a] bg-yellow',
} as const;

interface CalloutProps {
  type?: keyof typeof defaultTitles;
  title?: string;
  className?: string;
  children: ReactNode;
}

export function Callout({ type = 'note', title, className = '', children }: CalloutProps) {
  return (
    <aside className={`rounded-md border px-4 py-3 [&>*:last-child]:mb-0 ${tone[type]} ${className}`.trim()}>
      <strong className="mb-1 block font-bold">{title ?? defaultTitles[type]}</strong>
      {children}
    </aside>
  );
}
