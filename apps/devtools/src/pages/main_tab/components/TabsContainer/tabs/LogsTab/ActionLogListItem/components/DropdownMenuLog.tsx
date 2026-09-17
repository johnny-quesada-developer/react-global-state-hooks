import React from 'react';
import { extendedLogsById$ } from '@src/pages/main_tab/hooks/logsArray';
import { actionsById$ } from '@src/pages/main_tab/hooks/globalStates';
import type { ActionHeader } from '@src/pages/main_tab/hooks/globalStates/hooks/useActionsHeaders';
import { LogRestoreMenu, type RestoreTarget } from '../../_shared';

export type DropdownMenuLogProps = {
  header: ActionHeader;
  className?: string;
};

export const DropdownMenuLog: React.FC<DropdownMenuLogProps> = ({
  className = '',
  header,
}: DropdownMenuLogProps) => {
  // Resolve the action's last log state lazily, at confirm time, from the current stores.
  const resolveTarget = (): RestoreTarget | null => {
    const { globalStateId, actionId } = header;
    const action = actionsById$.getState().get(actionId);
    if (!action) return null;

    const { logs } = action;
    const lastLog = logs[logs.length - 1];
    if (!lastLog) return null;

    return {
      globalStateId,
      getState: () => extendedLogsById$.getState()[lastLog.logId]?.state,
    };
  };

  return <LogRestoreMenu className={className} resolveTarget={resolveTarget} />;
};

export default DropdownMenuLog;
