import React from 'react';
import { cn } from '@src/shared/tools/cn';
import { FaInfoCircle } from 'react-icons/fa';
import { SimpleFilter, SimpleFilterProps, Tooltip } from '@src/shared/components';

const tooltipContent = `createGlobalState(0, {
  name: 'stateName',
})`;

export type GlobalStateListFilterProps = React.HTMLAttributes<HTMLDivElement> & Pick<SimpleFilterProps, 'inputProps'>;

export const GlobalStateListFilter: React.FC<GlobalStateListFilterProps> = ({
  className = '',
  onChange: _onChange,
  inputProps,
  ...props
}: GlobalStateListFilterProps) => {
  return (
    <div
      className={cn('GlobalStateListFilter flex items-center gap-4 pr-2 border-b border-gray-400', className)}
      {...props}
    >
      <SimpleFilter className={'w-full'} inputProps={inputProps} />

      <Tooltip
        className="text-xs text-gray-500 cursor-pointer hover:scale-110 transition-all duration-300 hover:opacity-60"
        tooltipProps={{
          className: cn(
            'flex flex-col gap-2 text-left border',
            'bg-white text-black text-sm p-4 rounded-lg shadow-md w-80'
          ),
        }}
        tooltip={
          <React.Fragment>
            <p className="text-justify">
              To customize the <strong>state name</strong>, pass a <code>name</code> property in the optional parameters
              when creating a global state. This allows you to identify and manage your state more easily.
            </p>
            <pre className="bg-gray-200 p-2 rounded-sm text-blue-800">{tooltipContent}</pre>
          </React.Fragment>
        }
      >
        <FaInfoCircle className="text-base text-gray-500 dark:text-gray-300" />
      </Tooltip>
    </div>
  );
};

export default GlobalStateListFilter;
