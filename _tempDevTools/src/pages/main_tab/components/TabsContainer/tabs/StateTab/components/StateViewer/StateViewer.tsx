import React from 'react';
import { cn } from '@src/shared/tools/cn';
import selectedGlobalStateId$ from '@src/pages/main_tab/hooks/selectedGlobalStateId';
import { JsonCodeViewer, Tooltip } from '@src/shared/components';
import { useSendMessagesToContentScript } from '@src/pages/main_tab/hooks/useSendMessagesToContentScript';
import useStateMeta from '@src/pages/main_tab/hooks/globalStates/hooks/useStateMeta';
import useStableCallback from '@src/pages/main_tab/hooks/useStableCallback';
import { FaInfoCircle } from 'react-icons/fa';
import { BsArrowsCollapse } from 'react-icons/bs';
import { FiCode, FiCopy } from 'react-icons/fi';

export type StateViewerProps = React.HTMLAttributes<HTMLDivElement> & {};

export const StateViewer: React.FC<StateViewerProps> = ({ className = '', ...props }: StateViewerProps) => {
  const [globalStateId] = selectedGlobalStateId$();
  const [currentState] = useStateMeta(globalStateId, (state) => state?.currentState ?? null);

  const { sendMessageToContentScript } = useSendMessagesToContentScript();

  const onEdit = useStableCallback(<T,>(state: T) => {
    sendMessageToContentScript({
      action: `RESTORE_STATE`,
      payload: {
        actionName: 'setState',
        globalStateId,
        state,
      },
    });
  });

  return (
    <div className={cn('p-2 flex flex-col gap-4', className)} {...props}>
      <h2 className="border-b border-gray-400 dark:border-white pb-2 dark:text-white flex items-center gap-2">
        Current State{' '}
        <Tooltip
          className="text-xs text-gray-500 cursor-pointer hover:scale-110 transition-all duration-300 hover:opacity-60"
          tooltipProps={{
            className: cn(
              'flex flex-col gap-3 text-left border',
              'bg-white text-black text-sm p-4 rounded-lg shadow-md w-80'
            ),
          }}
          tooltip={
            <div className="flex flex-col gap-3">
              <p>This section displays the current state. You can inspect and modify it directly.</p>

              <div className="flex items-start gap-2">
                <BsArrowsCollapse className="mt-0.5 shrink-0 text-blue-400" />
                <span>
                  <strong>Collapse / Expand</strong> — collapse or expand the state structure.
                </span>
              </div>

              <div className="flex items-start gap-2">
                <FiCode className="mt-0.5 shrink-0 text-blue-400" />
                <span>
                  <strong>View</strong> — switch between tree and code views.
                </span>
              </div>

              <div className="flex items-start gap-2">
                <FiCopy className="mt-0.5 shrink-0 text-blue-400" />
                <span>
                  <strong>Copy</strong> — copy the complete state value to the clipboard.
                </span>
              </div>
            </div>
          }
        >
          <FaInfoCircle className="text-base" />
        </Tooltip>
      </h2>

      <JsonCodeViewer src={currentState} collapsed={4} onEdit={onEdit} />
    </div>
  );
};

export default StateViewer;
