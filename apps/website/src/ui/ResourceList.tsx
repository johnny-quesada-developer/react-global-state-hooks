import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';

const resourceList = tv({
  base: 'mt-4 mr-0 mb-0 ml-0 grid list-none gap-3 p-0',
  variants: {
    layout: {
      stacked: '',
      grid: 'grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-4',
    },
  },
  defaultVariants: { layout: 'stacked' },
});

type ResourceListProps = ComponentPropsWithoutRef<'ol'> & VariantProps<typeof resourceList> & { as?: 'ol' | 'ul' };

export function ResourceList({ as: Tag = 'ol', layout, className, ...props }: ResourceListProps) {
  return <Tag className={resourceList({ layout, className })} {...props} />;
}

interface ResourceItemProps {
  step?: string;
  title: ReactNode;
  children: ReactNode;
}

export function ResourceItem({ step, title, children }: ResourceItemProps) {
  return (
    <li className="flex items-baseline gap-3 rounded-md border border-line bg-bg px-4 py-3">
      {step && (
        <span className="flex-none font-mono text-xs leading-[normal] font-bold text-primary">{step}</span>
      )}
      <div>
        <h3 className="mt-0 mr-0 mb-1 ml-0 text-base leading-heading">{title}</h3>
        <p className="m-0 text-sm text-text-muted">{children}</p>
      </div>
    </li>
  );
}
