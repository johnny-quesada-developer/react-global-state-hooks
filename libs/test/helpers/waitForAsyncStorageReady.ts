/**
 * Wait until a store's async-storage bootstrap has completed (`isAsyncStorageReady === true`),
 * polling a bounded number of macrotasks.
 *
 * The native async-storage suite used to wait a fixed `setTimeout(..., 2)` after the state was
 * restored, assuming the ready flag would have flipped by then. That races the fake-storage read
 * and flakes under load (e.g. when the suite runs alongside the other patched projects, or the
 * patched + parity passes run back-to-back). Polling the actual condition removes the race while
 * still failing fast if the flag never flips.
 */
export async function waitForAsyncStorageReady(
  getMetadata: () => { isAsyncStorageReady?: boolean },
  { tries = 50, intervalMs = 1 }: { tries?: number; intervalMs?: number } = {},
): Promise<void> {
  for (let i = 0; i < tries && !getMetadata().isAsyncStorageReady; i++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
