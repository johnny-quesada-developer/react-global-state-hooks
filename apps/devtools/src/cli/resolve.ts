import type { AgentStoreInfo } from '../shared/agent/protocol';
import { storeLabel } from './format';

export type ResolvedTargets = {
  selectors: string[];
  unknown: { target: string; candidates: string[] }[];
};

const MAX_CANDIDATES = 8;

const editDistance = (a: string, b: string): number => {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }

  return previous[b.length];
};

const findCandidates = (target: string, stores: AgentStoreInfo[]): string[] => {
  const needle = target.toLowerCase();
  const labels = stores.map(storeLabel);

  const close = labels.filter((label) => {
    const candidate = label.toLowerCase();
    return candidate.includes(needle) || needle.includes(candidate) || editDistance(candidate, needle) <= 2;
  });

  return (close.length ? close : labels).slice(0, MAX_CANDIDATES);
};

/**
 * Turns `--store` values into the opaque selectors DevTools understands. A target matches a store
 * by exact name first, then by creation location (`ShoppingCart.tsx:23`, for unnamed stores).
 * Every target must match something: nothing is subscribed silently.
 */
export const resolveTargets = (targets: string[], stores: AgentStoreInfo[]): ResolvedTargets => {
  const selectors = new Set<string>();
  const unknown: ResolvedTargets['unknown'] = [];

  for (const target of targets) {
    const byName = stores.filter((store) => store.name === target);
    const matches = byName.length ? byName : stores.filter((store) => store.location?.endsWith(target));

    if (!matches.length) {
      unknown.push({ target, candidates: findCandidates(target, stores) });
      continue;
    }

    for (const store of matches) selectors.add(store.selector);
  }

  return { selectors: [...selectors], unknown };
};
