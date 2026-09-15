import { createGlobalState } from 'react-global-state-hooks/createGlobalState';

export const logsFilter$ = createGlobalState('', {
  name: 'logsFilter',
});

export default logsFilter$;
