import { createGlobalState } from 'react-global-state-hooks/createGlobalState';
import type { PageProbe } from '../util/probePage';

export type PageProblem = 'no-react' | 'no-patch';

export const PROBLEM_STREAK_TO_SHOW = 2;

export type PageDiagnosis = {
  probe: PageProbe | null;
  problem: PageProblem | null;
  streak: number;
  forced: boolean;
  reactDevToolsNoticeDismissed: boolean;
};

const problemOf = (probe: PageProbe): PageProblem | null => {
  if (!probe.ok) return null;
  if (!probe.react) return 'no-react';

  return probe.patch ? null : 'no-patch';
};

export const isFallbackVisible = ({ problem, streak, forced }: PageDiagnosis) =>
  problem !== null && streak >= PROBLEM_STREAK_TO_SHOW && !forced;

export const shouldSuggestReactDevTools = ({ probe, reactDevToolsNoticeDismissed }: PageDiagnosis) =>
  probe?.ok === true && probe.patch && !probe.reactDevTools && !reactDevToolsNoticeDismissed;

export const pageDiagnosis$ = createGlobalState(
  {
    probe: null,
    problem: null,
    streak: 0,
    forced: false,
    reactDevToolsNoticeDismissed: false,
  } as PageDiagnosis,
  {
    name: 'pageDiagnosis',
    actions: {
      probed(probe: PageProbe) {
        return ({ setState }) =>
          setState((state) => {
            const problem = problemOf(probe);

            return {
              ...state,
              probe,
              problem,
              streak: problem !== null && problem === state.problem ? state.streak + 1 : problem ? 1 : 0,
              forced: problem === null ? false : state.forced,
            };
          });
      },
      showAnyway() {
        return ({ setState }) => setState((state) => ({ ...state, forced: true }));
      },
      dismissReactDevToolsNotice() {
        return ({ setState }) => setState((state) => ({ ...state, reactDevToolsNoticeDismissed: true }));
      },
    },
  },
);
