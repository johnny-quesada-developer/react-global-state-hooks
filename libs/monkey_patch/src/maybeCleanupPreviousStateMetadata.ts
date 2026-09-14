import uniqueId from 'react-global-state-hooks/uniqueId';
import sendMessageFromMonkeyPath from './sendMessageFromMonkeyPath';

const buildPathPrefix = (sessionId: string) => `${sessionId}/gs-stack:`;
const buildEntryKey = (sessionId: string, globalStatePath: string) => `${buildPathPrefix(sessionId)}${globalStatePath}`;

export const maybeCleanupPreviousStateMetadata = ({
  sessionId,
  globalStatePath,
}: {
  globalStatePath: string;
  sessionId: string;
}) => {
  const entryKey = buildEntryKey(sessionId, globalStatePath);
  const isFastReload = sessionStorage.getItem(entryKey);

  // unique identifier that represent the stack from where the global state was created
  sessionStorage.setItem(entryKey, uniqueId('gs-hash:'));

  if (!isFastReload) return;

  sendMessageFromMonkeyPath({
    id: uniqueId('cleanup:'),
    action: 'CLEAR_GLOBAL_STATES',
    payload: {
      globalStatePath,
    },
  });
};

export const deletePreviousSessionStacks = (previousSessionId: string | null) => {
  // if the previous session id is Nil there is nothing to cleanup
  if (!previousSessionId) return;

  const keys = Object.keys(sessionStorage);
  for (const key of keys) {
    if (key.startsWith(buildPathPrefix(previousSessionId))) {
      sessionStorage.removeItem(key);
    }
  }

  sendMessageFromMonkeyPath({
    id: uniqueId('path:'),
    action: 'CLEAR_GLOBAL_STATES',
    payload: {
      globalStatePath: '*',
    },
  });
};
