export const globalStateListClass = 'GlobalStateList';
export const logsPerActionListClass = 'LogsPerActionList';

// Declarative marker each list stamps on its store-selected row, independent of
// useListNavigation's imperative data-navigation-selected. Used to move focus
// between the two lists with Arrow Left/Right.
export const DATA_LIST_SELECTED = 'data-list-selected';

const focusSelectedRow = (container: Element | null) => {
  if (!container) return;

  const selectedRow = container.querySelector<HTMLElement>(`[${DATA_LIST_SELECTED}]`);
  selectedRow?.focus();
};

export const focusGlobalStateList = () => {
  focusSelectedRow(document.querySelector(`.${globalStateListClass} ul`));
};

export const focusLogsPerActionList = () => {
  focusSelectedRow(document.querySelector(`.${logsPerActionListClass} ul`));
};
