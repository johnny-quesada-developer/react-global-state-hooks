import { useProfile } from './selective/store';
import { useTasks } from './tasks/store';
import { useServer, useUsers } from './async/fakeApi';
import { usePreferences } from './persistence/store';

export type DemoKind = 'selective' | 'tasks' | 'async' | 'persistence' | 'scoped';

/**
 * A one-line trace for the workbench status bar, derived from the real store of each example.
 * Returns the unsubscribe function.
 */
export function watchDemo(kind: DemoKind, log: (line: string) => void): () => void {
  switch (kind) {
    case 'selective': {
      let previous = useProfile.getState();
      return useProfile.subscribe(
        (profile) => {
          const changed = (Object.keys(profile) as (keyof typeof profile)[]).filter((key) => profile[key] !== previous[key]);
          previous = profile;
          if (!changed.length) return;
          log(`profile.${changed.join(', profile.')} changed · other selections unchanged`);
        },
        { skipFirst: true },
      );
    }
    case 'tasks': {
      let previous = useTasks.getState();
      return useTasks.subscribe(
        (state) => {
          const before = previous;
          previous = state;
          const open = state.tasks.filter((task) => !task.done).length;
          if (state.tasks.length > before.tasks.length) log(`add → tasks: ${state.tasks.length} · open: ${open}`);
          else if (state.tasks.length < before.tasks.length) log(`remove → tasks: ${state.tasks.length} · open: ${open}`);
          else log(`toggle → open: ${open} · done: ${state.tasks.length - open}`);
        },
        { skipFirst: true },
      );
    }
    case 'async': {
      const stop = useUsers.subscribe(
        (state) => {
          if (state.status === 'loading') log(`status: loading · attempt ${state.attempts}`);
          else if (state.status === 'success') log(`status: success · users: ${state.users.length}`);
          else if (state.status === 'error') log('status: error · retry available');
          else log('status: idle');
        },
        { skipFirst: true },
      );
      const stopServer = useServer.subscribe((server) => log(server.failing ? 'server: failing' : 'server: responding'), {
        skipFirst: true,
      });
      return () => {
        stop();
        stopServer();
      };
    }
    case 'persistence':
      return usePreferences.subscribe(
        (state) => log(`save → accent: ${state.accent} · size: ${state.size} · compact: ${state.compact}; draft excluded`),
        { skipFirst: true },
      );
    default:
      return () => {};
  }
}
