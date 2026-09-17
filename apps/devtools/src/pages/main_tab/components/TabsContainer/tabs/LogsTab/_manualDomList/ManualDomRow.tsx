import React from 'react';
import { cn } from '@src/shared/tools/cn';

export type ManualDomRowProps = {
  isFirst: boolean;
  children: React.ReactNode;
};

/**
 * A row in a manual-DOM list: a separator <li> above the actual item. The row
 * component (children) renders its own <li>, so both live directly under the
 * list <ul> via the display:contents mount.
 */
export const ManualDomRow: React.FC<ManualDomRowProps> = ({ isFirst, children }) => (
  <>
    <li
      className={cn(
        { 'first:border-none': isFirst },
        'border-b border-gray-400 text-gray-900 dark:border-gray-100',
      )}
    />
    {children}
  </>
);

export default ManualDomRow;
