import { createGlobalState } from 'react-global-state-hooks';

export const useCounter = createGlobalState({ count: 0, label: 'clicks' });

// An observable is a read-only, subscribable slice of the store. It needs no component.
export const count$ = useCounter.createObservable((state) => state.count);

export const seen: number[] = [];

// Runs immediately with the current value, then whenever `count` changes.
export const stop = count$.subscribe((count) => seen.push(count));
