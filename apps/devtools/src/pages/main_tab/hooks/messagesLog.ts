import createGlobalState from 'react-global-state-hooks/createGlobalState';
import type { ContentScriptMessage } from './globalStates';
import globalStates$ from './globalStates';
import { AdaptiveEntityAdapter } from '@src/shared/tools';

export type MessagesLog = ContentScriptMessage<unknown>;

export const MESSAGES_RETENTION_ACTIVATION_THRESHOLD = 5000;
export const MESSAGES_RETENTION_MAX_SIZE = 15000;

const createMessagesLogAdapter = (state?: AdaptiveEntityAdapter<string, MessagesLog>) => {
  return new AdaptiveEntityAdapter<string, MessagesLog>(state, {
    activationThreshold: MESSAGES_RETENTION_ACTIVATION_THRESHOLD,
    maxSize: MESSAGES_RETENTION_MAX_SIZE,
  });
};

const initialValue = createMessagesLogAdapter();

export const messagesLog$ = createGlobalState(initialValue, {
  name: 'messagesLog',
  actions: {
    push: (message: MessagesLog) => {
      return ({ setState, getState }) => {
        if (!globalStates$.getMetadata().logMessages) return;
        if (!message?.id) return;

        const nextState = createMessagesLogAdapter(getState());
        nextState.append(message.id, message);

        return setState(nextState);
      };
    },
  },
});

export default messagesLog$;
