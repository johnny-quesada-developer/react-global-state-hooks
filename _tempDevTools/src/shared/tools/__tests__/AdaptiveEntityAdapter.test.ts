import { describe, expect, it } from 'vitest';
import { AdaptiveEntityAdapter } from '../AdaptiveEntityAdapter';

describe('AdaptiveEntityAdapter', () => {
  const createAdapter = () =>
    new AdaptiveEntityAdapter<string, { value: number }>({}, { activationThreshold: 5, maxSize: 8 });

  it('keeps all entities below threshold', () => {
    const adapter = createAdapter();

    for (let index = 0; index < 4; index++) {
      adapter.append(`k-${index}`, { value: index });
    }

    expect(adapter.length).toBe(4);
    expect(adapter.retentionActive).toBe(false);
    expect(adapter.getBaseIndex()).toBe(0);
    expect(adapter.ids[0]).toBe('k-0');
  });

  it('activates retention after threshold is reached', () => {
    const adapter = createAdapter();

    for (let index = 0; index < 5; index++) {
      adapter.append(`k-${index}`, { value: index });
    }

    expect(adapter.retentionActive).toBe(true);
    expect(adapter.length).toBe(5);
  });

  it('drops oldest half when max size is exceeded', () => {
    const adapter = createAdapter();

    // maxSize=8 → dropCount = Math.floor(8/2) = 4
    // Pushing k-8 (9th item) triggers drop of k-0..k-3, leaving [k-4..k-8]
    // Pushing k-9 adds normally, leaving [k-4..k-9]
    for (let index = 0; index < 10; index++) {
      adapter.append(`k-${index}`, { value: index });
    }

    expect(adapter.length).toBe(6);
    expect(adapter.getBaseIndex()).toBe(4);
    expect(adapter.ids[0]).toBe('k-4');
    expect(adapter.ids[adapter.ids.length - 1]).toBe('k-9');
    expect(adapter.get('k-0')).toBeUndefined();
    expect(adapter.get('k-3')).toBeUndefined();
    expect(adapter.get('k-4')).toBeDefined();
  });

  it('preserves retention metadata when cloning state', () => {
    const adapter = createAdapter();

    for (let index = 0; index < 10; index++) {
      adapter.append(`k-${index}`, { value: index });
    }

    const clone = new AdaptiveEntityAdapter(adapter, { activationThreshold: 5, maxSize: 8 });

    expect(clone.length).toBe(6);
    expect(clone.retentionActive).toBe(true);
    expect(clone.getBaseIndex()).toBe(4);
    expect(clone.ids[0]).toBe('k-4');
  });
});
