import type { ComponentPropsWithoutRef } from 'react';
import { tv, type VariantProps } from '../lib/tv';

const badge = tv({
  base: 'inline-flex items-center gap-[6px] rounded-[5px] border border-line bg-soft px-[9px] py-[3px] text-10 leading-[1.7] font-[550] tracking-[0.045em] whitespace-nowrap text-muted',
  variants: {
    tone: {
      neutral: '',
      green: 'border-[light-dark(#dce8df,#1d241f)] bg-green-soft text-green',
      blue: 'border-[light-dark(#e2e6ef,#1e2126)] bg-blue-soft text-blue',
      amber: 'border-[light-dark(#ebe2cc,#292314)] bg-amber-soft text-amber',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

type BadgeProps = ComponentPropsWithoutRef<'span'> & VariantProps<typeof badge>;

export function Badge({ tone, className, ...props }: BadgeProps) {
  return <span className={badge({ tone, className })} {...props} />;
}
