import type { ComponentPropsWithoutRef } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';

const section = tv({
  variants: {
    tone: {
      plain: 'pt-12 pb-0',
      tinted: 'bg-sky py-8',
    },
    shell: {
      true: 'mx-auto w-full max-w-page px-4 md:px-6',
    },
  },
  defaultVariants: { tone: 'plain', shell: true },
});

type SectionProps = ComponentPropsWithoutRef<'section'> & VariantProps<typeof section>;

export function Section({ tone, shell, className, ...props }: SectionProps) {
  return <section className={section({ tone, shell, className })} {...props} />;
}

export function SectionTitle({ className, ...props }: ComponentPropsWithoutRef<'h2'>) {
  return <h2 className={`text-2xl leading-heading ${className ?? ''}`.trim()} {...props} />;
}

export function SectionLede({ className, ...props }: ComponentPropsWithoutRef<'p'>) {
  return <p className={`mt-2 mr-0 mb-6 ml-0 max-w-[46rem] text-text-muted ${className ?? ''}`.trim()} {...props} />;
}
