import type { ComponentPropsWithoutRef } from 'react';

interface PageHeaderProps {
  title: string;
  description: string;
  children?: ComponentPropsWithoutRef<'header'>['children'];
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <header className="mb-6">
      {children}
      <h1 className="text-3xl leading-heading">{title}</h1>
      <p className="mt-3 max-w-[46rem] text-lg text-text-muted">{description}</p>
    </header>
  );
}
