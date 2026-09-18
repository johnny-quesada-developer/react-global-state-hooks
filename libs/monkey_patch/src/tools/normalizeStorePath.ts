/**
 * A store's path is a `new Error().stack` captured where the store is created. Under a bundler dev
 * server the stack frame URLs carry cache-busting query strings — Vite appends `?v=<hash>` to
 * optimized dep chunks and `?t=<timestamp>` to a module's own URL on every HMR update. The SAME
 * creation site therefore yields a DIFFERENT stack across reloads/HMR.
 *
 * We need a stable key to detect that an HMR re-eval recreated a store at the same path (so the old
 * instance can be untracked). A query on a stack-frame URL is always a bundler artifact, never part
 * of the store's identity, so we strip the whole query (from `?` up to the `:line:col`, a `)`, or
 * whitespace), keeping the stable structure. This runs at store creation only, not on the hot path.
 *
 * Example: `.../auth.ts?t=1699999999999:15:30` -> `.../auth.ts:15:30`.
 */
export const normalizeStorePath = (storePath: string): string => {
  if (!storePath) return storePath;

  return storePath.replace(/\?[^:)\s]*/g, '');
};

export default normalizeStorePath;
