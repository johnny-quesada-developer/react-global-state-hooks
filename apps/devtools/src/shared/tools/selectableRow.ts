import clsx from 'clsx';
import { tv } from 'tailwind-variants';

/**
 * Shared row recipe for the selectable list items (ActionLogListItem,
 * LogListItem) so they render identically when selected. Theme comes from the
 * `dark` class variant; selection is the `selected` boolean variant.
 */
export const selectableRow = tv({
  base: clsx(
    'relative w-full flex gap-2 px-1 py-2 transition-colors duration-300',
    'justify-start items-center select-text cursor-pointer text-nowrap',
    'text-gray-900 dark:text-gray-100',
  ),
  variants: {
    selected: {
      true: '!border-l-4 !border-blue-500 !bg-blue-100 !dark:bg-blue-700',
      false: '!hover:bg-blue-200 !dark:hover:bg-blue-600',
    },
    error: {
      true: '!text-red-500',
    },
  },
  defaultVariants: {
    selected: false,
    error: false,
  },
});

/**
 * Shared styling for the action label shown in the selectable rows. Color is
 * driven by the action type; the row-level `error` variant overrides it in red.
 */
export const actionLabel = tv({
  base: 'font-semibold',
  variants: {
    actionType: {
      LIFE_CYCLE: '',
      LIFE_CYCLE_PARAMETER: '',
      CUSTOM_ACTION: '',
      STATE_ACTION: '',
    },
    error: {
      true: '',
      false: '',
    },
  },
  compoundVariants: [
    {
      error: false,
      actionType: 'LIFE_CYCLE',
      class: 'text-green-500',
    },
    {
      error: false,
      actionType: 'LIFE_CYCLE_PARAMETER',
      class: 'text-orange-500',
    },
  ],
  defaultVariants: {
    error: false,
  },
});
