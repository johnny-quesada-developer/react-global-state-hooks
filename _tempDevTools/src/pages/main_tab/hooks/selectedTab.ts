import { createGlobalState } from 'react-global-state-hooks/createGlobalState';

export type TopNavigationValue = 'logs' | 'actions' | 'messages' | 'state';
const initialValue = 'logs' as TopNavigationValue;

export const selectedTab$ = createGlobalState(initialValue, {
  name: 'selectedMainTab',
});

export default selectedTab$;
