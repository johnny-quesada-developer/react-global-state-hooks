import path from 'node:path';

/** True when `child` is `parent` itself or nested inside it, compared path-segment-wise. */
export function isPathInside({ child, parent }: { child: string; parent: string }): boolean {
  const relative = path.relative(parent, child);
  const isSameDirectory = relative === '';
  const isNested = relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
  return isSameDirectory || isNested;
}
