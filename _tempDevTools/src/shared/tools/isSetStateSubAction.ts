import type { ActionLogJson } from '../schema/ActionLogJson';
import { SubActionJsonEnum } from '../schema/SubActionJson';

const isSetStateSubAction = (log: ActionLogJson | null): boolean => {
  return log?.subAction === SubActionJsonEnum.setState;
};

export default isSetStateSubAction;
