import type { ComponentPropsWithoutRef } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';

const pagerLink = tv({
  base: 'block min-w-[40%] rounded-md border border-line-strong px-4 py-3 font-bold no-underline transition duration-150 ease-out hover:bg-mint',
  variants: {
    direction: {
      previous: '',
      next: 'ml-auto text-right',
    },
  },
  defaultVariants: { direction: 'previous' },
});

export function Pager({ className, ...props }: ComponentPropsWithoutRef<'nav'>) {
  return (
    <nav
      className={`mt-18 flex justify-between gap-4 border-t border-line pt-6 ${className ?? ''}`.trim()}
      data-pagefind-ignore
      {...props}
    />
  );
}

type PagerLinkProps = Omit<ComponentPropsWithoutRef<'a'>, 'children'> &
  Required<VariantProps<typeof pagerLink>> & { title: string };

export function PagerLink({ direction, title, className, ...props }: PagerLinkProps) {
  return (
    <a className={pagerLink({ direction, className })} rel={direction === 'next' ? 'next' : 'prev'} {...props}>
      <span className="block text-xs font-normal text-text-muted">
        {direction === 'next' ? 'Next' : 'Previous'}
      </span>
      {title}
    </a>
  );
}
