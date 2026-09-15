import React from 'react';
import { cn } from '@src/shared/tools/cn';
import { LogsList } from './LogsList';
import { LogDetails } from './LogDetails';
import { LogsPerActionList } from './LogsPerActionList';
import { Resizable } from '@src/shared/components/Resizable';
import { logsVisualizationType$ } from '@src/pages/main_tab/hooks/logsVisualizationType';
import { LogsVisualizationTypeSelector } from '../../../LogsVisualizationTypeSelector';

export type LogsTabProps = React.HTMLAttributes<HTMLDivElement>;

export const LogsTab: React.FC<LogsTabProps> = ({ className = '', ...props }: LogsTabProps) => {
  const [logDisplayType] = logsVisualizationType$();

  return (
    <Resizable initialLeft="30%" className={cn('LogsTab dark:bg-eighties', className)} {...props}>
      <div className="h-full flex flex-col min-h-0">
        <LogsVisualizationTypeSelector className="dark:text-white p-2 flex items-center gap-2 border-b border-gray-400" />

        {logDisplayType === 'LogsByTime' && <LogsList className="flex-1 min-h-0" />}

        {logDisplayType === 'LogsPerAction' && <LogsPerActionList className="flex-1 min-h-0" />}
      </div>

      <LogDetails className="flex-1" />
    </Resizable>
  );
};

export default LogsTab;
