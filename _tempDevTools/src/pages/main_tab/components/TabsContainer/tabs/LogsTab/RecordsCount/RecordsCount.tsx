import React from 'react';
import { cn } from '@src/shared/tools/cn';

export type RecordsCountProps = {
  count: number;
  total?: number;
  className?: string;
};

export const RecordsCount: React.FC<RecordsCountProps> = ({ count, total, className = '' }) => {
  const isFiltered = total !== undefined && total !== count;

  return (
    // eslint-disable-next-line tailwindcss/no-arbitrary-value
    <p className={cn('px-2 py-1 text-[9px] text-gray-500 dark:text-gray-400', className)}>
      Records: {isFiltered ? `${count} of ${total}` : count}
    </p>
  );
};

export default RecordsCount;
