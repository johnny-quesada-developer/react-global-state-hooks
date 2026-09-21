import formatToStore from 'json-storage-formatter/formatToStore';
import type { ActionJson, ActionLogJson, ActionUpdate } from '@src/shared/schema';
import { isSetStateSubAction } from '@src/shared/tools';
import {
  ALL_STORES,
  type AgentChange,
  type AgentEvent,
  type AgentStoreInfo,
  type AgentStoreRef,
  type AgentValue,
  type CliToPanel,
  type PanelToCli,
} from 'react-hooks-global-states-debug/agent/protocol';
import { diffState, PREVIEW_VALUE_LIMITS, READ_VALUE_LIMITS, toAgentValue } from '@src/shared/agent/stateDiff';
import { mergePatch, readPath } from '@src/shared/agent/stateOps';
import { getStoreLabel, getStoreLocation, getStoreSelector, isUnnamedStore } from '@src/shared/agent/storeInfo';
import type { GlobalStateMetaExtended } from '../hooks/globalStates/helpers/useGlobalStates.types';

type Message = { payload: unknown };

/** What the tracker needs from the panel model. Injected so the tracker never imports the stores. */
export type TrackerModel = {
  getStores: () => GlobalStateMetaExtended[];
  getStore: (globalStateId: string) => GlobalStateMetaExtended | undefined;
};

/** How the tracker reaches the inspected page, and whether the user allowed it to. */
export type TrackerControl = {
  isAllowed: () => boolean;
  /** Posts a `devtools-request/<action>` message to the page, the same route the panel UI uses. */
  dispatch: (action: 'EXECUTE_ACTION' | 'RESTORE_STATE', payload: object) => void;
};

type Subscription = { all: boolean; selectors: Set<string> };

type InFlightAction = {
  storeId: string;
  store: AgentStoreRef;
  action: string;
  input?: AgentValue[];
  steps: AgentChange[][];
  stateCalls: number;
  result?: { value?: AgentValue } | { error: string };
  lastAt: number;
};

/** Read from the model BEFORE the reducer runs: the reducer overwrites `currentState`. */
type Before =
  | { kind: 'state'; store: GlobalStateMetaExtended; previous: unknown }
  | { kind: 'lifecycle'; stores: Map<string, AgentStoreRef> }
  | { kind: 'none' };

const NOTHING: Before = { kind: 'none' };

const LIFECYCLE_ACTIONS = new Set(['ADD_GLOBAL_STATE', 'RE_ADD_GLOBAL_STATE', 'DELETE_GLOBAL_STATE', 'CLEAR_GLOBAL_STATES']);

// A hung async action would otherwise keep its entry forever.
const MAX_IN_FLIGHT = 200;
const PREVIEW_MAX_CHARS = 600;

const formatError = (error: unknown): string => {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return typeof error === 'string' ? error : JSON.stringify(toAgentValue(error));
};

/**
 * Turns the panel's message stream into agent events, for the stores an agent subscribed to.
 *
 * It does not keep a model of its own: the previous state of a store is read from the panel's
 * `globalStates$` right before the reducer overwrites it, and only for subscribed stores. With no
 * subscription `observe` is one null check, so a normal DevTools session pays nothing.
 *
 * Correlation: the page already tags every message of an action with the same `actionId`
 *   START_ACTION (args) → ADD_ACTION_LOG (setState step)* → ADD_ACTION_LOG (result | error)
 *   → UPDATE_ACTION (timing, sent last)
 * Messages are FIFO from a single port, so actions of different stores can interleave but each
 * action's own messages stay ordered. One event is emitted per action, when its timing arrives.
 */
export class AgentTracker {
  private subscription: Subscription | null = null;
  private matchCache = new Map<string, boolean>();
  private inFlight = new Map<string, InFlightAction>();

  constructor(
    private readonly model: TrackerModel,
    private readonly send: (message: PanelToCli) => void,
    private readonly control: TrackerControl,
  ) {}

  public get isActive() {
    return this.subscription !== null;
  }

  public handleRequest(request: CliToPanel) {
    if (request.type === 'GET_STORES') return this.send({ type: 'AVAILABLE_STORES', stores: this.describeStores() });
    if (request.type === 'UNSUBSCRIBE') return this.stop();
    if (request.type === 'SUBSCRIBE') return this.subscribe(request.selectors);
    if (request.type === 'GET_STATE') return this.readState(request);
    if (request.type === 'RUN_ACTION' || request.type === 'SET_STATE' || request.type === 'PATCH_STATE') {
      return this.runControl(request);
    }
  }

  /** Exactly one live store for a selector, or the reason there is not. */
  private findSingleStore(selector: string): GlobalStateMetaExtended | string {
    const stores = this.model.getStores().filter((store) => getStoreSelector(store) === selector);

    if (!stores.length) return 'That store is not known by DevTools any more.';
    if (stores.length > 1) {
      return `${stores.length} live instances share this store, and choosing one is not supported yet.`;
    }
    return stores[0];
  }

  /** Reading is passive, so it does not need the control switch. */
  private readState({ selector, path = '' }: Extract<CliToPanel, { type: 'GET_STATE' }>) {
    const store = this.findSingleStore(selector);
    if (typeof store === 'string') return this.send({ type: 'REQUEST_REJECTED', reason: store });

    const read = readPath(store.currentState, path);
    this.send({
      type: 'STATE',
      store: this.refOf(store),
      path,
      found: read.found,
      state: read.found && read.value !== undefined ? toAgentValue(read.value, READ_VALUE_LIMITS) : undefined,
      metadata: toAgentValue(store.metadata, READ_VALUE_LIMITS),
    });
  }

  /**
   * Terminal-requested changes go through the same page messages the panel UI sends. The CLI only
   * ever sends JSON values, and the action parameters string is rebuilt here from those values, so
   * the page never evaluates text the terminal wrote.
   */
  private runControl(request: Extract<CliToPanel, { type: 'RUN_ACTION' | 'SET_STATE' | 'PATCH_STATE' }>) {
    const reject = (reason: string) => this.send({ type: 'REQUEST_REJECTED', reason });

    if (!this.control.isAllowed()) {
      return reject(
        'The terminal is not allowed to change the app. In DevTools open the gear, "Terminal connection", ' +
          'and enable "Allow the terminal to change state and run actions".',
      );
    }

    const store = this.findSingleStore(request.selector);
    if (typeof store === 'string') return reject(store);

    const { globalStateId } = store;
    const ref = this.refOf(store);

    if (request.type === 'SET_STATE' || request.type === 'PATCH_STATE') {
      // A patch is merged here, against the model's current state, and sent as a full state. The
      // page keeps its real value wherever it sees a non-serializable placeholder.
      const state = request.type === 'SET_STATE' ? request.state : mergePatch(store.currentState, request.patch);

      this.control.dispatch('RESTORE_STATE', {
        actionName: 'setState',
        globalStateId,
        state: formatToStore(state),
      });
      return this.send({ type: 'DISPATCHED', store: ref });
    }

    const known = Object.keys(store.actions ?? {});
    if (!known.includes(request.action)) {
      return reject(`${ref.label} has no action "${request.action}". Available: ${known.join(', ') || '(none)'}`);
    }
    if (!Array.isArray(request.args)) return reject('Action arguments must be a JSON array.');

    this.control.dispatch('EXECUTE_ACTION', {
      actionName: request.action,
      globalStateId,
      // JSON text of the values without the brackets: valid as an argument list, and only data.
      parameters: JSON.stringify(request.args).slice(1, -1),
    });
    this.send({ type: 'DISPATCHED', store: ref });
  }

  /** Drops the subscription and everything held for it (CLI disconnected or unsubscribed). */
  public stop() {
    this.subscription = null;
    this.matchCache.clear();
    this.inFlight.clear();
  }

  /**
   * Wraps the panel's reducer for one message. Agent failures never reach the panel: the reducer
   * result is the only thing the caller sees.
   */
  public observe(action: string, message: Message, apply: () => void) {
    if (!this.subscription) return apply();

    let before = NOTHING;
    try {
      before = this.capture(action, message.payload);
    } catch (error) {
      console.error('[agent] capture failed', error);
    }

    apply();

    try {
      this.record(action, message.payload, before);
    } catch (error) {
      console.error('[agent] record failed', error);
    }
  }

  private subscribe(selectors: string[] | typeof ALL_STORES) {
    const stores = this.model.getStores();
    const known = new Set(stores.map(getStoreSelector));
    const all = selectors === ALL_STORES;
    const requested = all ? [] : selectors;

    const unknown = requested.filter((selector) => !known.has(selector));
    if (unknown.length) {
      return this.send({ type: 'REJECTED', reason: 'Some stores are not known by DevTools', unknown });
    }

    this.stop();
    this.subscription = { all, selectors: new Set(requested) };

    const matched = stores.filter((store) => this.matches(store)).map((store) => this.refOf(store));
    this.send({ type: 'SUBSCRIBED', matched, all });
  }

  private matches(store: GlobalStateMetaExtended): boolean {
    const subscription = this.subscription;
    if (!subscription) return false;
    if (subscription.all) return true;

    let matched = this.matchCache.get(store.globalStateId);
    if (matched === undefined) {
      matched = subscription.selectors.has(getStoreSelector(store));
      this.matchCache.set(store.globalStateId, matched);
    }
    return matched;
  }

  private refOf(store: GlobalStateMetaExtended): AgentStoreRef {
    const label = getStoreLabel(store);
    const selector = getStoreSelector(store);
    const siblings = this.model.getStores().filter((other) => getStoreSelector(other) === selector);

    if (siblings.length < 2) return { label };
    return { label, instance: siblings.findIndex((other) => other.globalStateId === store.globalStateId) + 1 };
  }

  private matchedRefs(): Map<string, AgentStoreRef> {
    const refs = new Map<string, AgentStoreRef>();
    for (const store of this.model.getStores()) {
      if (this.matches(store)) refs.set(store.globalStateId, this.refOf(store));
    }
    return refs;
  }

  private capture(action: string, payload: unknown): Before {
    if (action === 'START_ACTION' || action === 'ADD_ACTION_LOG') {
      const { globalStateId } = payload as ActionJson | ActionLogJson;
      const store = this.model.getStore(globalStateId);
      if (!store || !this.matches(store)) return NOTHING;

      return { kind: 'state', store, previous: store.currentState };
    }

    if (LIFECYCLE_ACTIONS.has(action)) {
      this.matchCache.clear();
      return { kind: 'lifecycle', stores: this.matchedRefs() };
    }

    return NOTHING;
  }

  private record(action: string, payload: unknown, before: Before) {
    if (before.kind === 'lifecycle') return this.recordLifecycle(before.stores);

    if (action === 'UPDATE_ACTION') return this.recordUpdate(payload as ActionUpdate);
    if (before.kind !== 'state') return;

    if (action === 'START_ACTION') return this.recordStart(payload as ActionJson, before);
    if (action === 'ADD_ACTION_LOG') return this.recordLog(payload as ActionLogJson, before);
  }

  private recordStart(action: ActionJson, { store, previous }: Extract<Before, { kind: 'state' }>) {
    const [firstLog] = action.logs;

    // A direct setState is complete in one message: there is no action around it.
    if (isSetStateSubAction(firstLog)) {
      const changes = diffState(previous, firstLog.payload);

      return this.emit({
        kind: 'action',
        at: firstLog.timestamp,
        store: this.refOf(store),
        action: action.action,
        steps: changes.length ? [changes] : [],
        stateCalls: 1,
      });
    }

    if (this.inFlight.size >= MAX_IN_FLIGHT) this.inFlight.delete(this.inFlight.keys().next().value!);

    const args = Array.isArray(firstLog.payload) ? firstLog.payload : [];
    this.inFlight.set(action.actionId, {
      storeId: store.globalStateId,
      store: this.refOf(store),
      action: action.action,
      input: args.length ? args.map((arg) => toAgentValue(arg)) : undefined,
      steps: [],
      stateCalls: 0,
      lastAt: firstLog.timestamp,
    });
  }

  private recordLog(log: ActionLogJson, { previous }: Extract<Before, { kind: 'state' }>) {
    const pending = this.inFlight.get(log.actionId);
    if (!pending) return;

    pending.lastAt = log.timestamp;

    if (isSetStateSubAction(log)) {
      pending.stateCalls++;
      const changes = diffState(previous, log.payload);
      if (changes.length) pending.steps.push(changes);
      return;
    }

    if (log.case === 'rejected') {
      pending.result = { error: formatError(log.error) };
    } else if (log.case === 'resolved') {
      pending.result = log.payload === undefined ? {} : { value: toAgentValue(log.payload) };
    }
  }

  private recordUpdate({ actionId, timing }: ActionUpdate) {
    const pending = this.inFlight.get(actionId);
    // `async: true` updates carry no timing: the action is still running.
    if (!pending || timing === undefined) return;

    this.inFlight.delete(actionId);
    this.emit({
      kind: 'action',
      at: pending.lastAt,
      store: pending.store,
      action: pending.action,
      input: pending.input,
      steps: pending.steps,
      stateCalls: pending.stateCalls,
      result: pending.result,
      durationMs: timing,
    });
  }

  private recordLifecycle(previouslyMatched: Map<string, AgentStoreRef>) {
    const now = this.matchedRefs();
    const at = Date.now();

    for (const [id, store] of now) {
      if (!previouslyMatched.has(id)) this.emit({ kind: 'store-created', at, store });
    }

    for (const [id, store] of previouslyMatched) {
      if (now.has(id)) continue;

      this.emit({ kind: 'store-removed', at, store });
      for (const [actionId, pending] of this.inFlight) {
        if (pending.storeId === id) this.inFlight.delete(actionId);
      }
    }
  }

  private emit(event: AgentEvent) {
    this.send({ type: 'EVENT', event });
  }

  private describeStores(): AgentStoreInfo[] {
    const bySelector = new Map<string, AgentStoreInfo>();

    for (const store of this.model.getStores()) {
      const selector = getStoreSelector(store);
      const known = bySelector.get(selector);
      if (known) {
        known.instances++;
        continue;
      }

      bySelector.set(selector, {
        selector,
        name: isUnnamedStore(store.name) ? null : store.name,
        location: getStoreLocation(store.globalStatePath),
        isContext: store.isContext,
        persistedKey: store.localStorage?.key ?? null,
        instances: 1,
        preview: this.previewOf(store.currentState),
        actions: Object.keys(store.actions ?? {}),
      });
    }

    return [...bySelector.values()];
  }

  private previewOf(state: unknown): string {
    const preview = JSON.stringify(toAgentValue(state, PREVIEW_VALUE_LIMITS), null, 2) ?? 'undefined';
    return preview.length > PREVIEW_MAX_CHARS ? `${preview.slice(0, PREVIEW_MAX_CHARS)}…` : preview;
  }
}
