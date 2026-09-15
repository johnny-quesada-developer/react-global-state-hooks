import React from 'react';
import { cn } from '@src/shared/tools/cn';
import { JsonCodeViewer } from '../JsonCodeViewer';

export type CompareJsonValuesProps = React.HTMLAttributes<HTMLDivElement> & {
  titlePrevious: string;
  titleCurrent: string;
  previous: unknown | null;
  current: unknown;
};

export const CompareJsonValues: React.FC<CompareJsonValuesProps> = ({
  className = '',
  titlePrevious,
  previous,
  titleCurrent,
  current,
  ...props
}: CompareJsonValuesProps) => {
  return (
    <div
      className={cn(
        'grid gap-2',
        {
          'grid-cols-1': !previous,
          'grid-cols-2': !!previous,
        },
        className
      )}
      {...props}
    >
      {!!previous && <h1 className="text-left font-semibold text-sm">{titlePrevious}</h1>}
      <h1 className="text-left font-semibold text-sm">{titleCurrent}</h1>

      {!!previous && <JsonCodeViewer src={previous} collapsed={3} />}
      <JsonCodeViewer src={current} collapsed={3} />
    </div>
  );
};

export default CompareJsonValues;
