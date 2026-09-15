import { createGlobalState } from 'react-global-state-hooks/createGlobalState';

export type LogsTabState = 'LogsPerAction' | 'LogsByTime';

export const logsVisualizationType$ = createGlobalState('LogsPerAction' as LogsTabState, {
  name: 'logsVisualizationType',
});

export default logsVisualizationType$;
