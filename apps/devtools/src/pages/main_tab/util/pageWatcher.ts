import { pageDiagnosis$ } from '../hooks/pageDiagnosis';
import { probePage, type PageProbe } from './probePage';

const FAST_POLL_MS = 1000;
const SLOW_POLL_MS = 5000;
const FAST_POLL_ATTEMPTS = 5;
// Once the page looks ready, keep checking at this pace forever, instead of going idle. A tab
// restored from the browser's back/forward cache runs no script and may fire no `onNavigated`
// (the only other thing that wakes the watcher), so without this heartbeat the panel can go stale
// until the visitor does a real reload.
const HEARTBEAT_MS = 5000;

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
  if (current !== generation) return;

  if (isReady(probe)) {
    timer = setTimeout(() => void poll(current), HEARTBEAT_MS);

    return;
  }

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
