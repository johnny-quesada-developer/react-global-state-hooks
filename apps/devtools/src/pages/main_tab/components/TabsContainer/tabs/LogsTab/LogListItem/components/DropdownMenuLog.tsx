import React from 'react';
import { StateLog } from '@src/pages/main_tab/hooks/globalStates/helpers/useGlobalStates.types';
import { LogRestoreMenu } from '../../_shared';

export type DropdownMenuLogProps = {
  log: StateLog;
  className?: string;
};

export const DropdownMenuLog: React.FC<DropdownMenuLogProps> = ({
  className = '',
  log,
}: DropdownMenuLogProps) => {
  return (
    <LogRestoreMenu
      className={className}
      resolveTarget={() => ({
        globalStateId: log.globalStateId,
        getState: () => log.state,
      })}
    />
  );
};

export default DropdownMenuLog;
