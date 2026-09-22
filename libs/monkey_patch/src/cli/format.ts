import type {
  AgentActionEvent,
  AgentChange,
  AgentEvent,
  AgentStoreInfo,
  AgentStoreRef,
  AgentValue,
  PanelToCli,
} from '../agent/protocol';

const INLINE_MAX = 100;

const pad = (value: number, size = 2) => String(value).padStart(size, '0');

const formatTime = (at: number) => {
  const date = new Date(at);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
};

export const formatStoreRef = ({ label, instance }: AgentStoreRef) => `[${label}${instance ? ` #${instance}` : ''}]`;

/** Compact JSON when it fits on a line, indented JSON otherwise. `indent` is the parent's indentation. */
const formatValue = (value: AgentValue | undefined, indent: string): string => {
  if (value === undefined) return 'undefined';

  const inline = JSON.stringify(value);
  if (inline.length <= INLINE_MAX) return inline;

  return JSON.stringify(value, null, 2).replace(/\n/g, `\n${indent}`);
};

const formatChange = (change: AgentChange, indent: string): string => {
  const { path, before, after } = change;

  // A marker such as "(+3 more changes)" carries no values.
  if (!('before' in change) && !('after' in change)) return path;

  return `${path || '(state)'}: ${formatValue(before, indent)} → ${formatValue(after, indent)}`;
};

const formatSteps = (event: AgentActionEvent): string[] => {
  const { steps, stateCalls } = event;

  if (!stateCalls) return [];
  if (!steps.length) return ['  state: no change'];

  return steps.flatMap((changes, index) => {
    const title = steps.length > 1 ? `  state (${index + 1}/${steps.length}):` : '  state:';
    return [title, ...changes.map((change) => `    ${formatChange(change, '    ')}`)];
  });
};

const formatAction = (event: AgentActionEvent): string[] => {
  const { store, action, input, result, durationMs } = event;
  const call = action === 'setState' ? 'setState' : `${action}(${(input ?? []).map((arg) => JSON.stringify(arg)).join(', ')})`;

  const lines = [`${formatTime(event.at)} ${formatStoreRef(store)} ${call}`, ...formatSteps(event)];

  if (result && 'error' in result) lines.push(`  error: ${result.error}`);
  // A void action prints nothing: an error is always explicit, so no result means it returned nothing.
  else if (result && result.value !== undefined) lines.push(`  result: ${formatValue(result.value, '  ')}`);

  if (durationMs !== undefined) lines.push(`  duration: ${durationMs}ms`);
  return lines;
};

/** One chronological block per event. The store always comes first so a mixed stream stays readable. */
export const formatEvent = (event: AgentEvent): string => {
  if (event.kind === 'action') return formatAction(event).join('\n');

  const what = event.kind === 'store-created' ? 'store created' : 'store removed';
  return `${formatTime(event.at)} ${formatStoreRef(event.store)} ${what}`;
};

export const storeTitle = (store: AgentStoreInfo): string => {
  if (store.name) return store.instances > 1 ? `${store.name} (${store.instances} instances)` : store.name;
  return `unnamed — ${store.location ?? 'unknown location'}`;
};

/** Label used to pick a store on the command line and in messages. */
export const storeLabel = (store: AgentStoreInfo): string =>
  store.name ?? `unnamed ${store.location ?? ''}`.trim();

const oneLine = (text: string, max = 120) => {
  const flat = text.replace(/\s*\n\s*/g, ' ');
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
};

/** The non-interactive discovery output: what an agent reads to choose `--store` values. */
export const formatStoreList = (stores: AgentStoreInfo[]): string => {
  if (!stores.length) return 'No stores known by DevTools yet. Load the app with the debug package imported.';

  return stores
    .map((store) =>
      [
        storeTitle(store),
        ...(store.name && store.location ? [`  at ${store.location}`] : []),
        `  state: ${oneLine(store.preview)}`,
        ...(store.actions.length ? [`  actions: ${store.actions.join(', ')}`] : []),
      ].join('\n'),
    )
    .join('\n\n');
};

/** The reply to `rgsh state`: the state (or the part at a path), then the metadata with its caveat. */
export const formatState = (reply: Extract<PanelToCli, { type: 'STATE' }>): string => {
  const pretty = (value: AgentValue | undefined) => (value === undefined ? 'undefined' : JSON.stringify(value, null, 2));

  return [
    `${formatStoreRef(reply.store)} state${reply.path ? ` at ${reply.path}` : ''}:`,
    pretty(reply.state),
    '',
    'metadata (as announced when the store was created; later setMetadata calls are not reported):',
    pretty(reply.metadata),
  ].join('\n');
};
