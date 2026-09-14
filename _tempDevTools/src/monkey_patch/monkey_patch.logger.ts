import { type ActionId, type ActionJson, type ActionUpdate, assertActionUpdate } from './schema/ActionJson';
import { type SetStateConfigJson } from './schema/SetStateConfigJson';
import { ActionTypeJsonEnum } from './schema/ActionTypeJson';
import { SubActionJsonEnum } from './schema/SubActionJson';
import sendMessageFromMonkeyPath from './sendMessageFromMonkeyPath';
import { generateActionLogId, type ActionLogJson } from './schema/ActionLogJson';
import uniqueId from 'react-global-state-hooks/uniqueId';

export class Logger {
  // globalStateId => storeId
  public storeId: string;

  public prefix: string;

  /**
   * Logger constructor
   * @param args.storeId - The unique identifier for the global store
   * @param args.prefix - Optional prefix to identify the logs of specific lifecycle events
   */
  constructor(args: { storeId: string; prefix?: string }) {
    this.storeId = args.storeId;
    this.prefix = args.prefix ?? '';
  }

  public addEntryForInitialAction = (args: {
    action: string;
    firstLog: Omit<ActionLogJson, 'scope' | 'logId' | 'timestamp' | 'globalStateId'>;
    actionType: ActionTypeJsonEnum;
  }) => {
    const actionMeta: ActionJson = {
      actionId: args.firstLog.actionId,
      globalStateId: this.storeId,
      action: args.action,
      async: false,
      start: Date.now(),
      timing: 0,
      actionType: args.actionType,
      logs: [
        {
          ...args.firstLog,
          logId: generateActionLogId(),
          scope: this.prefix,
          timestamp: Date.now(),
          globalStateId: this.storeId,
        },
      ],
    };

    sendMessageFromMonkeyPath({
      id: uniqueId('logger:'),
      action: 'START_ACTION',
      payload: actionMeta,
    });

    return actionMeta;
  };

  public pushActionLogUpdate = (actionUpdate: ActionUpdate) => {
    assertActionUpdate(actionUpdate);

    sendMessageFromMonkeyPath({
      id: uniqueId('logger:'),
      action: 'UPDATE_ACTION',
      payload: actionUpdate,
    });
  };

  /**
   * Pushes a new action log entry
   */
  public pushActionEntry = ({
    log,
    actionMeta,
    isFinalEntry,
  }: {
    actionMeta: ActionJson;
    log: Omit<ActionLogJson, 'scope' | 'logId' | 'timestamp' | 'globalStateId'>;
    isFinalEntry: boolean;
  }) => {
    sendMessageFromMonkeyPath({
      id: uniqueId('logger:'),
      action: 'ADD_ACTION_LOG',
      payload: {
        ...log,
        logId: generateActionLogId(),
        scope: this.prefix,
        timestamp: Date.now(),
        globalStateId: this.storeId,
      },
    });

    if (!isFinalEntry) return;

    return this.pushActionLogUpdate({
      actionId: log.actionId,
      globalStateId: this.storeId,
      timing: Date.now() - actionMeta.start,
    });
  };

  /**
   * Record simple state mutation (setState)
   */
  public recordStateMutation = (args: { actionId: ActionId; state: unknown; config?: SetStateConfigJson }) => {
    const firstLog: ActionLogJson = {
      globalStateId: this.storeId,
      actionId: args.actionId,
      logId: generateActionLogId(),
      payload: args.state,
      case: 'resolved',
      setStateConfig: args.config,
      timestamp: Date.now(),
      subAction: SubActionJsonEnum.setState,
      scope: this.prefix,
    };

    this.addEntryForInitialAction({
      action: 'setState',
      firstLog,
      actionType: ActionTypeJsonEnum.STATE_ACTION,
    });
  };
}
