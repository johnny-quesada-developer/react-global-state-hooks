import type { AgentChange, AgentValue } from 'react-hooks-global-states-debug/agent/protocol';

/**
 * Structural, path-based diff for agent output.
 *
 * Why not `diffJson` (what the panel UI uses): it diffs two pretty-printed strings, so it reports
 * text hunks instead of paths, needs two full `JSON.stringify` passes, and is quadratic in the
 * worst case. The state payloads also arrive as fresh clones on every message, so no reference
 * shortcut exists across messages. A single walk that stops descending where values are equal is
 * O(size) and yields `todos[2].done: false → true` directly.
 *
 * Bounded on purpose: a node budget caps the walk on huge states, and a change budget caps the
 * output. Overflow is reported explicitly, never silently dropped.
 */

export type ValueLimits = {
  depth: number;
  items: number;
  keys: number;
  string: number;
};

export const CHANGE_VALUE_LIMITS: ValueLimits = { depth: 4, items: 20, keys: 30, string: 200 };
/** For an explicit read: the agent asked for the data, so the limits are generous. */
export const READ_VALUE_LIMITS: ValueLimits = { depth: 8, items: 200, keys: 100, string: 2000 };
export const PREVIEW_VALUE_LIMITS: ValueLimits = { depth: 3, items: 4, keys: 10, string: 40 };

const MAX_NODES = 50_000;
const MAX_CHANGES = 30;

type Budget = { nodes: number; changes: AgentChange[]; overflow: number };

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null) return false;
  if (Array.isArray(value)) return false;
  return !(value instanceof Date || value instanceof Map || value instanceof Set || value instanceof Error);
};

export const toAgentValue = (
  value: unknown,
  limits: ValueLimits = CHANGE_VALUE_LIMITS,
  depth = 0,
): AgentValue => {
  if (value === null || value === undefined) return null;

  switch (typeof value) {
    case 'string':
      return value.length > limits.string
        ? `${value.slice(0, limits.string)}…(+${value.length - limits.string} chars)`
        : value;
    case 'number':
      return Number.isFinite(value) ? value : String(value);
    case 'boolean':
      return value;
    case 'bigint':
      return `${value}n`;
    case 'function':
      return '[Function]';
    case 'symbol':
      return String(value);
  }

  if (value instanceof Date) return Number.isNaN(value.getTime()) ? 'Invalid Date' : value.toISOString();
  if (value instanceof Error) return `${value.name}: ${value.message}`;

  if (value instanceof Map) {
    return { $map: toAgentValue([...value.entries()], limits, depth) };
  }

  if (value instanceof Set) {
    return { $set: toAgentValue([...value.values()], limits, depth) };
  }

  if (Array.isArray(value)) {
    if (depth >= limits.depth) return `[…${value.length} items]`;

    const shown = value.slice(0, limits.items).map((item) => toAgentValue(item, limits, depth + 1));
    if (value.length > limits.items) shown.push(`…(+${value.length - limits.items} items)`);
    return shown;
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (depth >= limits.depth) return `{…${entries.length} keys}`;

  const result: { [key: string]: AgentValue } = {};
  for (const [key, item] of entries.slice(0, limits.keys)) {
    if (item === undefined) continue;
    result[key] = toAgentValue(item, limits, depth + 1);
  }
  if (entries.length > limits.keys) result['…'] = `(+${entries.length - limits.keys} keys)`;
  return result;
};

const joinKey = (path: string, key: string) => {
  if (/^[A-Za-z_$][\w$]*$/.test(key)) return path ? `${path}.${key}` : key;
  return `${path}[${JSON.stringify(key)}]`;
};

const deepEqual = (a: unknown, b: unknown, budget: Budget): boolean => {
  if (Object.is(a, b)) return true;
  if (budget.nodes-- <= 0) return false;

  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index], budget));
  }

  if (a instanceof Map && b instanceof Map) return deepEqual([...a.entries()], [...b.entries()], budget);
  if (a instanceof Set && b instanceof Set) return deepEqual([...a.values()], [...b.values()], budget);

  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    return keys.every((key) => key in b && deepEqual(a[key], b[key], budget));
  }

  return false;
};

const record = (budget: Budget, change: AgentChange) => {
  if (budget.changes.length >= MAX_CHANGES) {
    budget.overflow++;
    return;
  }
  budget.changes.push(change);
};

const added = (budget: Budget, path: string, after: unknown) =>
  record(budget, { path, after: toAgentValue(after) });

const removed = (budget: Budget, path: string, before: unknown) =>
  record(budget, { path, before: toAgentValue(before) });

const walk = (path: string, a: unknown, b: unknown, budget: Budget): void => {
  if (Object.is(a, b)) return;
  if (--budget.nodes <= 0) return;

  if (Array.isArray(a) && Array.isArray(b)) return walkArrays(path, a, b, budget);

  if (isPlainObject(a) && isPlainObject(b)) {
    for (const key of Object.keys(a)) {
      const childPath = joinKey(path, key);
      if (!(key in b) || b[key] === undefined) {
        if (a[key] !== undefined) removed(budget, childPath, a[key]);
        continue;
      }
      if (a[key] === undefined) {
        added(budget, childPath, b[key]);
        continue;
      }
      walk(childPath, a[key], b[key], budget);
    }

    for (const key of Object.keys(b)) {
      if (key in a || b[key] === undefined) continue;
      added(budget, joinKey(path, key), b[key]);
    }
    return;
  }

  // Leaf, or a change of kind (object → array, Map → Set...). Equal Dates/Maps/Sets are not changes.
  if (deepEqual(a, b, budget)) return;

  const change: AgentChange = { path };
  if (a !== undefined) change.before = toAgentValue(a);
  if (b !== undefined) change.after = toAgentValue(b);
  record(budget, change);
};

/**
 * Arrays are compared after trimming the equal head and tail, so removing or inserting one item
 * reports that one item instead of every following index shifting by one.
 */
const walkArrays = (path: string, a: unknown[], b: unknown[], budget: Budget) => {
  const shortest = Math.min(a.length, b.length);

  let head = 0;
  while (head < shortest && deepEqual(a[head], b[head], budget)) head++;

  let tail = 0;
  while (tail < shortest - head && deepEqual(a[a.length - 1 - tail], b[b.length - 1 - tail], budget)) tail++;

  const middleA = a.slice(head, a.length - tail);
  const middleB = b.slice(head, b.length - tail);
  const overlap = Math.min(middleA.length, middleB.length);

  for (let index = 0; index < overlap; index++) {
    walk(`${path}[${head + index}]`, middleA[index], middleB[index], budget);
  }
  for (let index = overlap; index < middleA.length; index++) {
    removed(budget, `${path}[${head + index}]`, middleA[index]);
  }
  for (let index = overlap; index < middleB.length; index++) {
    added(budget, `${path}[${head + index}]`, middleB[index]);
  }
};

/**
 * Changes between two states, empty when they are equal. When the state is too large to walk
 * within the node budget, a single root change with truncated values is returned instead.
 */
export const diffState = (previous: unknown, next: unknown): AgentChange[] => {
  const budget: Budget = { nodes: MAX_NODES, changes: [], overflow: 0 };

  walk('', previous, next, budget);

  if (budget.nodes <= 0) {
    return [{ path: '(state too large to diff)', before: toAgentValue(previous), after: toAgentValue(next) }];
  }

  if (budget.overflow) budget.changes.push({ path: `(+${budget.overflow} more changes)` });
  return budget.changes;
};
