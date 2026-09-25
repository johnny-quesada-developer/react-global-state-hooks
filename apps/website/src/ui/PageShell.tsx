import type { ComponentPropsWithoutRef, ElementType } from 'react';
import { tv } from 'tailwind-variants';

const pageShell = tv({ base: 'mx-auto w-full max-w-page px-4 md:px-6' });

type PageShellProps<T extends ElementType> = { as?: T } & Omit<ComponentPropsWithoutRef<T>, 'as'>;

export function PageShell<T extends ElementType = 'div'>({ as, className, ...props }: PageShellProps<T>) {
  const Tag = (as ?? 'div') as ElementType;

  return <Tag className={pageShell({ className })} {...props} />;
}
