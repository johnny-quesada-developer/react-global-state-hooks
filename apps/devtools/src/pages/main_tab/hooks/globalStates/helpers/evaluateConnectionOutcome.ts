import type { LoadMismatch } from '../../../hooks/loadMismatch';

export type SnapshotStoreRef = { name: string; globalStatePath: string };

/**
 * Pure, synchronous check of whether a snapshot will connect to what the panel is currently
 * mirroring — done BEFORE loading anything.
 *
 * The panel is a live mirror of the page, and stores are inherently multi-instance: many instances
 * can share one `globalStatePath` (it comes from the creation stack). Reconnection is per-path and
 * index-aligned — the i-th loaded instance at a path connects to the i-th live instance there
 * (a[i] = b[i]). A loaded instance is unconnected when the path has no live store, OR when the path
 * has fewer live instances than the snapshot holds (the surplus instances have nothing to pair to).
 *
 * Inputs:
 *  - `snapshotStores`: the stores in the file (display name + creation path), in file order.
 *  - `liveCountByPath`: how many live instances the panel currently has at each path.
 *
 * Returns null when every snapshot instance can pair with a live instance (nothing to warn about).
 */
export const evaluateSnapshotAgainstLive = (
  snapshotStores: SnapshotStoreRef[],
  liveCountByPath: ReadonlyMap<string, number>,
): LoadMismatch | null => {
  if (!snapshotStores.length) return null;

  const connected: string[] = [];
  const unconnected: string[] = [];

  // Consume live instances per path in order, matching how loadMockState pairs them.
  const consumedByPath = new Map<string, number>();

  for (const { name, globalStatePath } of snapshotStores) {
    const available = liveCountByPath.get(globalStatePath) ?? 0;
    const consumed = consumedByPath.get(globalStatePath) ?? 0;

    if (consumed < available) connected.push(name);
    else unconnected.push(name);

    consumedByPath.set(globalStatePath, consumed + 1);
  }

  if (!unconnected.length) return null;

  // Nothing connected and the panel has no live stores at all => wrong app / not running.
  // Otherwise the app is running but doesn't have (all of) the snapshot's instances => partial.
  const hasAnyLive = liveCountByPath.size > 0;
  const kind: LoadMismatch['kind'] = !connected.length && !hasAnyLive ? 'no-live-page' : 'partial';

  return { kind, connected, unconnected };
};
