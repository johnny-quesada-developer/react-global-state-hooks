import { createGlobalState } from 'react-global-state-hooks';
import { createUsersStore, type FetchUsers } from './store';

// The demo's "server" switch. It is a store too, so the checkbox and the fetcher share it.
export const useServer = createGlobalState({ failing: false });

export const fetchUsers: FetchUsers = () =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      if (useServer.getState().failing) {
        reject(new Error('The server did not respond (simulated).'));
        return;
      }

      resolve([
        { id: 1, name: 'Ada Lovelace' },
        { id: 2, name: 'Grace Hopper' },
        { id: 3, name: 'Margaret Hamilton' },
      ]);
    }, 700);
  });

export const useUsers = createUsersStore(fetchUsers);
