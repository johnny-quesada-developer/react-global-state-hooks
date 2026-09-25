import type { ReactNode } from 'react';

export function BenefitList({ children }: { children: ReactNode }) {
  return (
    <ul className="mt-4 mr-0 mb-0 ml-0 grid list-none grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-4 p-0">
      {children}
    </ul>
  );
}

export function BenefitCard({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <li className="rounded-md border border-line px-6 py-4 shadow-sm transition duration-150 ease-out hover:border-line-strong hover:shadow-md">
      <h3 className="mb-2 text-lg leading-heading">{title}</h3>
      <p className="m-0 text-sm text-text-muted">{children}</p>
    </li>
  );
}
