import React from 'react';
import { cn } from '@src/shared/tools/cn';

export type BadgeVariant = 'context' | 'neutral';

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export const Badge: React.FC<BadgeProps> = ({
  className = '',
  variant = 'neutral',
  children,
  ...props
}: BadgeProps) => {
  return (
    <span
      {...props}
      className={cn(
        'inline-flex items-center rounded-sm px-1 text-xxs font-semibold uppercase tracking-wide leading-4',
        {
          'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200': variant === 'context',
          'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200': variant === 'neutral',
        },
        className
      )}
    >
      {children}
    </span>
  );
};

export default Badge;
