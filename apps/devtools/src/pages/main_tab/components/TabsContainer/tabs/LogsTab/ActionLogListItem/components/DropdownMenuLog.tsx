import React, { useCallback } from 'react';
import { cn } from '@src/shared/tools/cn';
import { IoEllipsisVertical } from 'react-icons/io5';
import { useSendMessagesToContentScript } from '@src/pages/main_tab/hooks/useSendMessagesToContentScript';
import { extendedLogsById$ } from '@src/pages/main_tab/hooks/logsArray';
import { actionsById$ } from '@src/pages/main_tab/hooks/globalStates';
import type { ActionHeader } from '@src/pages/main_tab/hooks/globalStates/hooks/useActionsHeaders';

export type DropdownMenuLogProps = React.HTMLAttributes<HTMLButtonElement> & {
  header: ActionHeader;
};

export const DropdownMenuLog: React.FC<DropdownMenuLogProps> = ({
  className = '',
  header,
  ...props
}: DropdownMenuLogProps) => {
  const { sendMessageToContentScript } = useSendMessagesToContentScript();

  const onClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      event.preventDefault();

      const restore = confirm('Do you want to restore this state?');
      if (!restore) return;

      const { globalStateId, actionId } = header;
      const action = actionsById$.getState().get(actionId);
      if (!action) return;

      const { logs } = action;
      const { logId: lastLogId } = logs[logs.length - 1];
      const { state: lastState } = extendedLogsById$.getState()[lastLogId];

      sendMessageToContentScript({
        action: `RESTORE_STATE`,
        payload: {
          actionName: 'setState',
          globalStateId,
          state: lastState,
        },
      });
    },
    [header, sendMessageToContentScript]
  );

  return (
    <button
      onClick={onClick}
      className={cn('absolute top-0 right-0 w-6 h-full flex justify-center items-center hover:scale-125', className)}
      {...props}
    >
      <IoEllipsisVertical />
    </button>
  );
};

export default DropdownMenuLog;
