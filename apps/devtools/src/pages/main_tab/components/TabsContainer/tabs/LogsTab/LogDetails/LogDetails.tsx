import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '@src/shared/tools/cn';
import { StateDiff } from './StateDiff';
import { PayloadDisplay } from './PayloadDisplay';
import { StateDiffPerAction } from './StateDiffPerAction';
import { ActionStepsDetails } from './ActionStepsDetails';
import { logsVisualizationType$ } from '@src/pages/main_tab/hooks/logsVisualizationType';

export type LogDetailsProps = React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>;

type DetailTab = 'summary' | 'entry_payload' | 'action_steps';

export const LogDetails: React.FC<LogDetailsProps> = ({ className: _className, ...props }: LogDetailsProps) => {
  const [selectedTab, setSelectedTab] = useState<DetailTab>('summary');
  const [logDisplayType] = logsVisualizationType$();

  const tabs: {
    label: string;
    value: DetailTab;
  }[] = useMemo(
    () => [
      {
        label: 'SUMMARY',
        value: 'summary',
      },
      ...(logDisplayType === 'LogsPerAction'
        ? ([
            {
              label: 'ACTION GRANULARITY',
              value: 'action_steps',
            },
          ] as const)
        : []),
      ...(logDisplayType === 'LogsByTime'
        ? ([
            {
              label: 'PAYLOAD',
              value: 'entry_payload',
            },
          ] as const)
        : []),
    ],
    [logDisplayType]
  );

  useEffect(() => {
    setSelectedTab('summary');
  }, [logDisplayType]);

  return (
    <div className={cn('flex flex-col h-full')} {...props}>
      <ul className="font-medium text-gray-900 dark:text-gray-100 bg-white dark:bg-eighties border-b border-gray-400 flex sticky top-0">
        {tabs.map(({ label, value }) => (
          <li
            key={value}
            className={cn('border-r px-4 py-2 transition-all duration-300', {
              'bg-blue-100 dark:bg-blue-700': selectedTab === value,
              'hover:bg-blue-200 dark:hover:bg-blue-600': selectedTab !== value,
            })}
          >
            <button className="hover:underline" onClick={() => setSelectedTab(value)}>
              {label}
            </button>
          </li>
        ))}
      </ul>

      {logDisplayType === 'LogsByTime' && selectedTab === 'summary' && (
        <StateDiff className="dark:bg-eighties flex-grow flex-shrink basis-0 overflow-y-auto dark:text-white" />
      )}

      {selectedTab === 'entry_payload' && (
        <PayloadDisplay className="dark:bg-eighties flex-grow flex-shrink basis-0 overflow-y-auto dark:text-white" />
      )}

      {logDisplayType === 'LogsPerAction' && selectedTab === 'summary' && (
        <StateDiffPerAction className="dark:bg-eighties flex-grow flex-shrink basis-0 overflow-y-auto dark:text-white" />
      )}

      {logDisplayType === 'LogsPerAction' && selectedTab === 'action_steps' && (
        <ActionStepsDetails className="dark:bg-eighties flex-grow flex-shrink basis-0 overflow-y-auto dark:text-white" />
      )}
    </div>
  );
};

export default LogDetails;
