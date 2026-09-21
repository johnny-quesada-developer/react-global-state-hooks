/**
 * Wire protocol between the DevTools panel (WebSocket client, runs the model) and the `rgsh` CLI
 * (WebSocket server, runs in Node). JSON text frames, one message per frame.
 *
 *   CLI                          panel
 *   GET_STORES        ───────▶
 *                     ◀───────   AVAILABLE_STORES
 *   SUBSCRIBE         ───────▶
 *                     ◀───────   SUBSCRIBED | REJECTED
 *                     ◀───────   EVENT ...
 *   UNSUBSCRIBE       ───────▶   (or the socket closing)
 *
 * This file is imported by both the browser bundle and the Node CLI: types and constants only.
 */

export const AGENT_DEFAULT_PORT = 7787;

/** WebSocket close code sent to a panel that a newer panel replaced. It must not reconnect. */
export const AGENT_CLOSE_SUPERSEDED = 4001;

/** The value of `SUBSCRIBE.selectors` that means "every store". */
export const ALL_STORES = '*';

export type AgentStoreInfo = {
  /** Opaque key the CLI echoes back in SUBSCRIBE. Stable across HMR/remounts (name or creation site). */
  selector: string;
  /** Explicit store name, or `null` for an unnamed store. */
  name: string | null;
  /** `file:line` where the store was created, when it can be told from the creation stack. */
  location: string | null;
  isContext: boolean;
  /** localStorage key when the store is persisted. */
  persistedKey: string | null;
  /** Live instances sharing this selector (context stores can be mounted several times). */
  instances: number;
  /** Compact, truncated JSON of the current state so an unnamed store can still be recognised. */
  preview: string;
  actions: string[];
};

/** JSON-safe rendering of a value. Truncation is marked explicitly, never silent. */
export type AgentValue = string | number | boolean | null | AgentValue[] | { [key: string]: AgentValue };

export type AgentChange = {
  /** `todos[2].done`; empty string is the root. */
  path: string;
  /** Absent when the value did not exist before (added). */
  before?: AgentValue;
  /** Absent when the value no longer exists (removed). */
  after?: AgentValue;
};

export type AgentStoreRef = {
  /** The store name, or `unnamed <location>` for a store created without one. */
  label: string;
  /** 1-based, only present when several live instances share the same label. */
  instance?: number;
};

export type AgentActionEvent = {
  kind: 'action';
  at: number;
  store: AgentStoreRef;
  /** `setState` for a direct state mutation. */
  action: string;
  /** Arguments the action was called with (custom actions only). */
  input?: AgentValue[];
  /** One entry per setState step, in order. Steps that changed nothing are dropped. */
  steps: AgentChange[][];
  /** How many setState calls ran. `steps` can be shorter when some were no-ops. */
  stateCalls: number;
  /** `value` is absent when the action returned nothing. */
  result?: { value?: AgentValue } | { error: string };
  durationMs?: number;
};

export type AgentLifecycleEvent = {
  kind: 'store-created' | 'store-removed';
  at: number;
  store: AgentStoreRef;
};

export type AgentEvent = AgentActionEvent | AgentLifecycleEvent;

export type PanelToCli =
  | { type: 'HELLO'; version: 1; tabId: number | null; page: string | null }
  | { type: 'AVAILABLE_STORES'; stores: AgentStoreInfo[] }
  | { type: 'SUBSCRIBED'; matched: AgentStoreRef[]; all: boolean }
  | { type: 'REJECTED'; reason: string; unknown: string[] }
  /** The request was handed to the page. Its outcome arrives later as an EVENT. */
  | { type: 'DISPATCHED'; store: AgentStoreRef }
  /** The request could not be served: not allowed, unknown store, unknown action, and so on. */
  | { type: 'REQUEST_REJECTED'; reason: string }
  | {
      type: 'STATE';
      store: AgentStoreRef;
      /** The path that was read, empty for the whole state. */
      path: string;
      /** False when nothing exists at `path`. */
      found: boolean;
      state?: AgentValue;
      /** As announced by the page. The patch does not track later setMetadata calls. */
      metadata: AgentValue;
    }
  | { type: 'EVENT'; event: AgentEvent };

export type CliToPanel =
  | { type: 'GET_STORES' }
  | { type: 'SUBSCRIBE'; selectors: string[] | typeof ALL_STORES }
  | { type: 'UNSUBSCRIBE' }
  /** Runs a store action. `args` are JSON values: data, never code. */
  | { type: 'RUN_ACTION'; selector: string; action: string; args: unknown[] }
  /** Replaces a store's state with JSON data, like restoring a state from DevTools. */
  | { type: 'SET_STATE'; selector: string; state: unknown }
  /** Objects merge into the current state, anything else (primitives, arrays, null) replaces it. */
  | { type: 'PATCH_STATE'; selector: string; patch: unknown }
  /** Reads a store's current state, or the part of it at `path` (`todos[0].done`). */
  | { type: 'GET_STATE'; selector: string; path?: string };
