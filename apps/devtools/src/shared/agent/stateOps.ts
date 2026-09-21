/**
 * Small pure helpers behind `rgsh state <store> <path>` and `rgsh patch`.
 */

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  !(value instanceof Date || value instanceof Map || value instanceof Set || value instanceof Error);

/**
 * Applies a patch to a state. Plain objects merge key by key, recursively; everything else
 * (primitives, arrays, null, Dates...) replaces. Keys the patch does not mention are kept, and
 * that includes the `__non_serializable__` placeholders DevTools holds for functions and the like:
 * the page keeps its real value when it sees one of them (see mergeState in the debug patch).
 */
export const mergePatch = (state: unknown, patch: unknown): unknown => {
  if (!isPlainObject(patch) || !isPlainObject(state)) return patch;

  const merged: Record<string, unknown> = { ...state };
  for (const [key, value] of Object.entries(patch)) merged[key] = mergePatch(state[key], value);
  return merged;
};

const PATH_TOKEN = /\.?([A-Za-z_$][\w$]*)|\[(\d+)\]|\["((?:[^"\\]|\\.)*)"\]/y;

/** `todos[0].done` → ['todos', 0, 'done']. Null when the path is not well formed. */
export const parsePath = (path: string): (string | number)[] | null => {
  const tokens: (string | number)[] = [];
  PATH_TOKEN.lastIndex = 0;

  while (PATH_TOKEN.lastIndex < path.length) {
    const match = PATH_TOKEN.exec(path);
    if (!match) return null;

    if (match[1] !== undefined) tokens.push(match[1]);
    else if (match[2] !== undefined) tokens.push(Number(match[2]));
    else tokens.push(JSON.parse(`"${match[3]}"`));
  }

  return tokens;
};

export type PathRead = { found: true; value: unknown } | { found: false };

/** The value at `path`, told apart from "nothing there". A bad path is `found: false`. */
export const readPath = (state: unknown, path: string): PathRead => {
  const tokens = parsePath(path.trim());
  if (!tokens) return { found: false };

  let current: unknown = state;
  for (const token of tokens) {
    if (typeof token === 'number' ? !Array.isArray(current) : !isPlainObject(current)) return { found: false };

    const container = current as Record<string | number, unknown>;
    if (!(token in container)) return { found: false };
    current = container[token];
  }

  return { found: true, value: current };
};
