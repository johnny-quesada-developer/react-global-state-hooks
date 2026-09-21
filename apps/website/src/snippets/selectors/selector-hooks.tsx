import { createGlobalState, shallowCompare } from 'react-global-state-hooks';

export const useStore = createGlobalState({
  users: [
    { id: 1, name: 'Ada', active: true },
    { id: 2, name: 'Grace', active: false },
  ],
  currentUserId: 1,
});

// A selector hook is created once and shared. It returns the selected value, not a tuple.
export const useUsers = useStore.createSelectorHook((state) => state.users);

// Selector hooks chain. `isEqual` stops the derived list from changing when its items did not.
export const useActiveUsers = useUsers.createSelectorHook((users) => users.filter((user) => user.active), {
  isEqual: shallowCompare,
});

export function ActiveUsers() {
  const active = useActiveUsers();

  return <p>{active.map((user) => user.name).join(', ')}</p>;
}
