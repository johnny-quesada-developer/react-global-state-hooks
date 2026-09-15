import { describe, it, expect, beforeEach } from 'vitest';
import { devToolsExample, todoListExample } from '@src/helpers/useGlobalStates.mocks';
import { generateMockState } from '@src/helpers/generateMockState';
import { loadMockState, getStateSnapshot } from '../helpers/loadMockState';

describe('loadMockState + getStateSnapshot', () => {
  beforeEach(() => {
    // Reset stores between tests by loading an empty state
    loadMockState({ entities: {}, ids: [] });
  });

  describe('generateMockState', () => {
    it('returns devtools example by default', () => {
      expect(generateMockState()).toBe(devToolsExample);
    });

    it('returns devtools example when asked', () => {
      expect(generateMockState('devtools')).toBe(devToolsExample);
    });

    it('returns todolist example when asked', () => {
      expect(generateMockState('todolist')).toBe(todoListExample);
    });
  });

  describe('loadMockState + getStateSnapshot roundtrip', () => {
    it('loads devtools mock and snapshot has same global state ids', () => {
      loadMockState(devToolsExample);
      const snapshot = getStateSnapshot();

      expect(snapshot.ids).toEqual(devToolsExample.ids);
    });

    it('snapshot entities contain all global state ids from mock', () => {
      loadMockState(devToolsExample);
      const snapshot = getStateSnapshot();

      for (const stateId of devToolsExample.ids) {
        expect(snapshot.entities).toHaveProperty(stateId);
      }
    });

    it('each snapshot entity preserves key fields from mock', () => {
      loadMockState(devToolsExample);
      const snapshot = getStateSnapshot();

      for (const stateId of devToolsExample.ids) {
        const original = devToolsExample.entities[stateId as keyof typeof devToolsExample.entities];
        const loaded = snapshot.entities[stateId];

        expect(loaded.globalStateId).toBe(original.globalStateId);
        expect(loaded.name).toBe(original.name);
        expect(loaded.currentState).toEqual(original.currentState);
        expect(loaded.initialState).toEqual(original.initialState);
      }
    });

    it('all actions from mock are present in snapshot groupedByActionStateLogs', () => {
      loadMockState(devToolsExample);
      const snapshot = getStateSnapshot();

      for (const stateId of devToolsExample.ids) {
        const original = devToolsExample.entities[stateId as keyof typeof devToolsExample.entities];
        const originalActionIds: string[] = original.groupedByActionStateLogs?.ids ?? [];
        const snapshotActionIds: string[] = snapshot.entities[stateId].groupedByActionStateLogs.ids;

        // All original action ids should be present in the snapshot
        for (const actionId of originalActionIds) {
          expect(snapshotActionIds).toContain(actionId);
        }
      }
    });

    it('action logs are preserved', () => {
      loadMockState(devToolsExample);
      const snapshot = getStateSnapshot();

      for (const stateId of devToolsExample.ids) {
        const original = devToolsExample.entities[stateId as keyof typeof devToolsExample.entities];
        const originalActions = original.groupedByActionStateLogs?.entities ?? {};

        for (const actionId of Object.keys(originalActions)) {
          const originalAction = originalActions[actionId];
          const snapshotAction = snapshot.entities[stateId].groupedByActionStateLogs.entities[actionId];

          expect(snapshotAction).toBeDefined();
          expect(snapshotAction.actionId).toBe(originalAction.actionId);
          expect(snapshotAction.action).toBe(originalAction.action);
          expect(snapshotAction.logs).toEqual(originalAction.logs);
        }
      }
    });

    it('loads todolist mock correctly', () => {
      loadMockState(todoListExample);
      const snapshot = getStateSnapshot();

      expect(snapshot.ids).toEqual(todoListExample.ids);
      for (const stateId of todoListExample.ids) {
        expect(snapshot.entities).toHaveProperty(stateId);
      }
    });

    it('loading a second mock replaces the first', () => {
      loadMockState(devToolsExample);
      loadMockState(todoListExample);
      const snapshot = getStateSnapshot();

      expect(snapshot.ids).toEqual(todoListExample.ids);
      // devtools ids should not be present
      for (const stateId of devToolsExample.ids) {
        expect(snapshot.ids).not.toContain(stateId);
      }
    });
  });
});
