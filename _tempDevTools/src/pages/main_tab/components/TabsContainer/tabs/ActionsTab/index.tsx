import { ActionsTab as ActionsTabComponent, type ActionsTabProps } from './ActionsTab';
import actions$ from './context/actionsContext';

export const ActionsTab: React.FC<ActionsTabProps> = (props: ActionsTabProps) => {
  return (
    <actions$.Provider>
      <ActionsTabComponent {...props} />
    </actions$.Provider>
  );
};
