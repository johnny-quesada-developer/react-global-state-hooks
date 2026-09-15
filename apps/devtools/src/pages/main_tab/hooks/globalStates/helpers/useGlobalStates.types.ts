import type { ActionLogJson } from '@src/shared/schema/ActionLogJson';
import { ActionTypeJsonEnum } from '@src/shared/schema/ActionTypeJson';
import type { GlobalStateJson } from '@src/shared/schema/GlobalStateJson';

export type GlobalStateMetaExtended = GlobalStateJson & {
  currentState: unknown;
};

export type StateLog = ActionLogJson & {
  parentAction: string;
  state: unknown;
  parentActionType: ActionTypeJsonEnum;
  index: number;
};
