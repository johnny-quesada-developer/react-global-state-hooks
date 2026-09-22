import { createGlobalState } from 'react-global-state-hooks';

/** Whether the search dialog is open. Shared by the header button, the keyboard shortcut and the dialog. */
export const useSearchDialog = createGlobalState(
  { open: false },
  {
    name: 'searchDialog',
    actions: {
      show() {
        return ({ setState }) => setState({ open: true });
      },
      hide() {
        return ({ setState }) => setState({ open: false });
      },
    },
  },
);
