import { clsx, type ClassValue } from 'clsx';
import { twMerge } from './twMerge';

/**
 * Merge class names with conditional support (clsx) and Tailwind conflict
 * resolution (our theme-aware twMerge).
 *
 * Usage: cn('base flex', condition && 'text-red-500', className)
 * Put the caller-provided `className` LAST so it can override base classes.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default cn;
