import React from 'react';
import { cn } from '@src/shared/tools/cn';
import { Tooltip } from '@src/shared/components';
import { FaInfoCircle } from 'react-icons/fa';
import { selectedTab$ } from '../../hooks/selectedTab';
import { logsVisualizationType$, type LogsTabState } from '../../hooks/logsVisualizationType';

export type LogsVisualizationTypeSelectorProps = React.HTMLAttributes<HTMLUListElement>;

export const LogsVisualizationTypeSelector: React.FC<LogsVisualizationTypeSelectorProps> = ({
  className = '',
  ...props
}: LogsVisualizationTypeSelectorProps) => {
  const [selectedTab] = selectedTab$();
  const [logDisplayType, setLogDisplayType] = logsVisualizationType$();

  if (selectedTab !== 'logs') return null;

  return (
    <ul className={cn('flex justify-between items-center py-2 px-2.5 gap-4', className)} {...props}>
      <li className="text-gray-500 dark:text-white">Display:</li>
      {(
        [
          { label: 'groups', value: 'LogsPerAction', selected: logDisplayType === 'LogsPerAction' },
          { label: 'time logs', value: 'LogsByTime', selected: logDisplayType === 'LogsByTime' },
        ] as {
          label: string;
          value: LogsTabState;
          selected: boolean;
        }[]
      ).map((value) => (
        <li
          key={value.value}
          className={cn('cursor-pointer', {
            'text-blue-500': value.selected,
          })}
          onClick={() => setLogDisplayType(value.value)}
        >
          <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
            <input type="radio" checked={value.selected} className="whitespace-nowrap" readOnly />
            {value.label}
          </label>
        </li>
      ))}

      <li>
        <Tooltip
          className="text-xs text-gray-500 cursor-pointer hover:scale-110 transition-all duration-300 hover:opacity-60 flex"
          tooltipProps={{
            className: cn(
              'flex flex-col gap-2 text-left border',
              'bg-white text-black text-sm p-4 rounded-lg shadow-md w-96'
            ),
          }}
          tooltip={
            <React.Fragment>
              <p className="text-justify">
                Some logs are highlighted with colors, the meaning of each color is as follows:
              </p>

              <div className="bg-gray-200 p-2 rounded-sm flex gap-2 flex-col">
                <p>
                  <span className="text-green-500 font-bold">Green:</span> Lifecycle action, such as:
                </p>

                <ul className="list-disc pl-4">
                  <li>
                    <span className="font-bold">initialize:</span> Initializes the global state.
                  </li>
                  <li>
                    <span className="font-bold">localStorage:</span> Retrieves the state from the local storage if
                    configured.
                  </li>
                </ul>

                <p>These actions are executed automatically by the store.</p>

                <hr className="border-gray-500" />

                <p>
                  <span className="text-orange-500 font-bold">Orange:</span> Lifecycle parameter action which could be
                  added when creating the global state, such as:
                </p>

                <ul className="list-disc pl-4">
                  <li>
                    <span className="font-bold">onInit:</span> Called when the store is initialized.
                  </li>
                  <li>
                    <span className="font-bold">onStateChanged:</span> Called every time the state changes.
                  </li>
                  <li>
                    <span className="font-bold">onSubscribed:</span> Called when a subscriber is added.
                  </li>
                  <li>
                    <span className="font-bold">computePreventStateChange:</span> Called before the state changes.
                  </li>
                </ul>

                <p>
                  <span className="text-red-500 font-bold">Red:</span> Error, something went wrong.
                </p>
              </div>
            </React.Fragment>
          }
        >
          <FaInfoCircle className=" text-base mt-2" />
        </Tooltip>
      </li>
    </ul>
  );
};

export default LogsVisualizationTypeSelector;
