import createGlobalState from 'react-global-state-hooks/createGlobalState';

export const useIsConnecting = createGlobalState(() => false, {
  name: 'isConnecting',
});
