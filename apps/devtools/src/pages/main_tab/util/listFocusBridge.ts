export const globalStateListClass = 'GlobalStateList';
export const logsPerActionListClass = 'LogsPerActionList';
export const logsListClass = 'LogsList';

// Declarative marker each list stamps on its store-selected row, independent of
// useListNavigation's imperative data-navigation-selected. Used to move focus
// between the two lists with Arrow Left/Right.
export const DATA_LIST_SELECTED = 'data-list-selected';

const focusSelectedRow = (selector: string) => {
  const container = document.querySelector(selector);
  const selectedRow = container?.querySelector<HTMLElement>(`[${DATA_LIST_SELECTED}]`);
  selectedRow?.focus();
};

export const focusGlobalStateList = () => {
  focusSelectedRow(`.${globalStateListClass} ul`);
};

// Only one logs list is mounted at a time (per-action or by-time), so target
// whichever container is currently in the DOM.
export const focusLogsList = () => {
  focusSelectedRow(`.${logsPerActionListClass} ul, .${logsListClass} ul`);
};
