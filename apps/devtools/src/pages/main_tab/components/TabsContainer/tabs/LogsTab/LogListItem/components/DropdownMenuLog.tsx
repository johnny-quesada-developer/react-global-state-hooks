import React, { useCallback } from 'react';
import { cn } from '@src/shared/tools/cn';
import { IoEllipsisVertical } from 'react-icons/io5';
import { StateLog } from '@src/pages/main_tab/hooks/globalStates/helpers/useGlobalStates.types';
import { useSendMessagesToContentScript } from '@src/pages/main_tab/hooks/useSendMessagesToContentScript';

export type DropdownMenuLogProps = React.HTMLAttributes<HTMLButtonElement> & {
  log: StateLog;
};

export const DropdownMenuLog: React.FC<DropdownMenuLogProps> = ({
  className = '',
  log,
  ...props
}: DropdownMenuLogProps) => {
  const { sendMessageToContentScript } = useSendMessagesToContentScript();

  const onClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      event.preventDefault();

      const restore = confirm('Do you want to restore this state?');
      if (!restore) return;

      const { state, globalStateId } = log;

      sendMessageToContentScript({
        action: `RESTORE_STATE`,
        payload: {
          actionName: 'setState',
          globalStateId,
          state,
        },
      });
    },
    [log, sendMessageToContentScript]
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
