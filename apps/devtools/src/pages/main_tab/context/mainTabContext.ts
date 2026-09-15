import type { BuildTypeJsonEnum } from 'react-hooks-global-states-debug/dev-tools';
import { createContext } from 'react-global-state-hooks/createContext';

export const mainTab$ = createContext(
  {
    buildType: 'production' as BuildTypeJsonEnum,
  },
  {
    name: 'mainTabContext',
  }
);

export const useBuildType = mainTab$.use.createSelectorHook((state) => state.buildType, {
  name: 'useBuildType',
});

export default mainTab$;
