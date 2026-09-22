import { assertAddActionLogMessage, type AddActionLogMessage } from './AddActionLogMessage';
import { assertAddGlobalStateMessage, type AddGlobalStateMessage } from './AddGlobalStateMessage';
import { assertReAddGlobalStateMessage, type ReAddGlobalStateMessage } from './ReAddGlobalStateMessage';
import { assertClearGlobalStatesMessage, type ClearGlobalStatesMessage } from './ClearGlobalStatesMessage';
import { assertDeleteGlobalStateMessage, DeleteGlobalStateMessage } from './DeleteGlobalStateMessage';
import { assertSetBuildTypeMessage, type SetBuildTypeMessage } from './SetBuildTypeMessage';
import { assertStartActionMessage, type StartActionMessage } from './StartActionMessage';
import { assertUpdateActionMessage, type UpdateActionMessage } from './UpdateActionMessage';

export type MonkeyPathMessageJson =
  | SetBuildTypeMessage
  | AddGlobalStateMessage
  | ReAddGlobalStateMessage
  | StartActionMessage
  | ClearGlobalStatesMessage
  | UpdateActionMessage
  | AddActionLogMessage
  | DeleteGlobalStateMessage;

export type MonkeyPathMessage = MonkeyPathMessageJson;

const asserts: Record<MonkeyPathMessageJson['action'], (message: MonkeyPathMessage) => void | never> = {
  SET_REACT_BUILD_TYPE: assertSetBuildTypeMessage,
  ADD_GLOBAL_STATE: assertAddGlobalStateMessage,
  RE_ADD_GLOBAL_STATE: assertReAddGlobalStateMessage,
  START_ACTION: assertStartActionMessage,
  CLEAR_GLOBAL_STATES: assertClearGlobalStatesMessage,
  UPDATE_ACTION: assertUpdateActionMessage,
  ADD_ACTION_LOG: assertAddActionLogMessage,
  DELETE_GLOBAL_STATE: assertDeleteGlobalStateMessage,
};

export function assertMonkeyPathMessageJson(
  message: MonkeyPathMessage,
): asserts message is MonkeyPathMessageJson {
  const assert = asserts[message.action];
  assert(message);
}
