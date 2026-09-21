import { pageDiagnosis$ } from '../hooks/pageDiagnosis';
import { probePage, type PageProbe } from './probePage';

const FAST_POLL_MS = 1000;
const SLOW_POLL_MS = 5000;
const FAST_POLL_ATTEMPTS = 5;

let timer: ReturnType<typeof setTimeout> | undefined;
let attempt = 0;
let generation = 0;

export const checkPageNow = async (): Promise<PageProbe> => {
  const probe = await probePage();
  pageDiagnosis$.actions.probed(probe);

  return probe;
};

const isReady = (probe: PageProbe) => probe.ok && probe.patch;

const poll = async (current: number) => {
  const probe = await checkPageNow();
  if (current !== generation || isReady(probe)) return;

  attempt += 1;
  timer = setTimeout(() => void poll(current), attempt < FAST_POLL_ATTEMPTS ? FAST_POLL_MS : SLOW_POLL_MS);
};

export const restartPageWatcher = () => {
  clearTimeout(timer);
  attempt = 0;
  generation += 1;
  void poll(generation);
};

export const startPageWatcher = () => {
  restartPageWatcher();

  if (typeof chrome !== 'undefined') chrome.devtools?.network?.onNavigated?.addListener(restartPageWatcher);
};
