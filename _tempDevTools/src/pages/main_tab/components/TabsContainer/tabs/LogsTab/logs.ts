import type { ActionLogJson } from '@src/shared/schema/ActionLogJson';
import { createContext } from 'react-global-state-hooks/createContext';

const initialState = {
  previousLog: null as ActionLogJson | null,
  currentLog: null as ActionLogJson | null,
  logsFilter: '',
};

export type LogsTabContextType = typeof initialState;

export const logsTab$ = createContext(() => ({ ...initialState }));

export default logsTab$;
