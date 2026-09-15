import createContext from 'react-global-state-hooks/createContext';

export type CodeViewerState = ReturnType<typeof initialState>;

const initialState = () => ({
  viewType: 'code' as 'json' | 'code',
  collapsed: false as boolean | number,
  copied: false,
  src: undefined as unknown,
});

export const codeViewer$ = createContext(initialState, {
  metadata: () => ({
    onEdit: undefined as (<T>(stateWrapper: T) => void) | undefined,
  }),
});

export default codeViewer$;
