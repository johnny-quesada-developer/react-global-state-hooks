import type { ComponentPropsWithoutRef } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';

const buttonLink = tv({
  base: 'inline-flex cursor-pointer items-center gap-2 rounded-md border border-primary px-[1.1rem] py-[0.6rem] font-sans text-base leading-[1.2] font-semibold no-underline transition duration-150 ease-out active:scale-[0.97]',
  variants: {
    variant: {
      primary: 'bg-primary text-on-primary hover:bg-primary-hover hover:text-on-primary',
      secondary: 'bg-bg text-primary hover:bg-mint hover:text-primary-hover',
    },
  },
  defaultVariants: { variant: 'primary' },
});

type ButtonLinkProps = ComponentPropsWithoutRef<'a'> & VariantProps<typeof buttonLink>;

export function ButtonLink({ variant, className, ...props }: ButtonLinkProps) {
  return <a className={buttonLink({ variant, className })} {...props} />;
}
