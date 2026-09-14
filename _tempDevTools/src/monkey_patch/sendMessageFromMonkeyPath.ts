import formatToStore from 'json-storage-formatter/formatToStore';

import {
  assertMonkeyPathMessageJson,
  type MonkeyPathMessageJson,
  type MonkeyPathMessage,
} from './schema/MonkeyPathMessageJson';

export type MessageToContentScript =
  | ({
      action: `monkey-patch/${string}`;
    } & Omit<MonkeyPathMessageJson, 'action'>)
  | { action: 'ping'; id: string };

const sendMessageFromMonkeyPath = (message: MonkeyPathMessage) => {
  assertMonkeyPathMessageJson(message);

  const copy: MessageToContentScript = {
    id: message.id,
    timestamp: performance.now(),
    action: `monkey-patch/${message.action}`,
    payload: formatToStore(message.payload) as unknown as MonkeyPathMessageJson['payload'],
  };

  window.postMessage(copy);
};

export default sendMessageFromMonkeyPath;
