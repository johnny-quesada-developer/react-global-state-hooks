import { describe, it, expect } from 'vitest';
import { assertActionLogJson, isActionLogJson } from '../ActionLogJson';
import { SubActionJsonEnum } from '../SubActionJson';

describe('ActionLogJson schema validation', () => {
  it('should validate a properly formed ActionLogJson with scope', () => {
    const validLog = {
      logId: 'action-log:abc123',
      globalStateId: 'state:123',
      actionId: 'action:456',
      payload: { test: 'data' },
      case: 'resolved' as const,
      scope: 'lifecycle',
      timestamp: Date.now(),
      subAction: SubActionJsonEnum.setState,
    };

    expect(isActionLogJson(validLog)).toBe(true);
    expect(() => assertActionLogJson(validLog)).not.toThrow();
  });

  it('should accept null payload and subAction', () => {
    const validLog = {
      logId: 'action-log:xyz789',
      globalStateId: 'state:456',
      actionId: 'action:789',
      payload: null,
      case: 'rejected' as const,
      scope: 'action',
      timestamp: Date.now(),
      subAction: null,
    };

    expect(isActionLogJson(validLog)).toBe(true);
  });

  it('should accept different scope values', () => {
    const scopes = ['lifecycle', 'action', 'callback'];

    scopes.forEach((scope) => {
      const validLog = {
        logId: 'action-log:test',
        globalStateId: 'state:test',
        actionId: 'action:test',
        payload: {},
        case: 'resolved' as const,
        scope,
        timestamp: Date.now(),
        subAction: SubActionJsonEnum.setState,
      };

      expect(isActionLogJson(validLog)).toBe(true);
    });
  });

  it('should accept all case values', () => {
    const cases = ['pending', 'resolved', 'rejected'] as const;

    cases.forEach((caseValue) => {
      const validLog = {
        logId: 'action-log:test',
        globalStateId: 'state:test',
        actionId: 'action:test',
        payload: null,
        case: caseValue,
        scope: 'test',
        timestamp: Date.now(),
        subAction: null,
      };

      expect(isActionLogJson(validLog)).toBe(true);
    });
  });
});
