import React from 'react';
import { logsFilter$ } from '../_hooks';
import { SimpleFilter } from '@src/shared/components';

export type LogsFilterProps = React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>;

export const LogsFilter: React.FC<LogsFilterProps> = ({ className = '', ...props }: LogsFilterProps) => {
  const [logsFilter, setLogsFilter] = logsFilter$();

  return (
    <SimpleFilter
      {...props}
      className={className}
      inputProps={{
        defaultValue: logsFilter,
        placeholder: 'Search logs...',
        onChange: (event) => {
          setLogsFilter(event.target.value);
        },
      }}
    />
  );
};

export default LogsFilter;
