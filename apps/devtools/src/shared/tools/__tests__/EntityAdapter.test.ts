import { describe, it, expect } from 'vitest';
import { EntityAdapter } from '../EntityAdapter';

describe('EntityAdapter', () => {
  it('should initialize empty', () => {
    const adapter = new EntityAdapter();
    expect(adapter.values()).toEqual([]);
  });

  it('should add entities', () => {
    const adapter = new EntityAdapter<string, { id: string; name: string }>();
    adapter.add('1', { id: '1', name: 'Test' });

    expect(adapter.values()).toHaveLength(1);
    expect(adapter.get('1')).toEqual({ id: '1', name: 'Test' });
  });

  it('should update entities', () => {
    const adapter = new EntityAdapter<string, { id: string; name: string }>();
    adapter.add('1', { id: '1', name: 'Original' });
    adapter.add('1', { id: '1', name: 'Updated' });

    expect(adapter.get('1')).toEqual({ id: '1', name: 'Updated' });
  });

  it('should delete entities', () => {
    const adapter = new EntityAdapter<string, { id: string; name: string }>();
    adapter.add('1', { id: '1', name: 'Test' });
    adapter.delete('1');

    expect(adapter.get('1')).toBeUndefined();
    expect(adapter.values()).toHaveLength(0);
  });

  it('should handle multiple entities', () => {
    const adapter = new EntityAdapter<string, { id: string; value: number }>();
    adapter.add('1', { id: '1', value: 10 });
    adapter.add('2', { id: '2', value: 20 });
    adapter.add('3', { id: '3', value: 30 });

    expect(adapter.values()).toHaveLength(3);
    expect(adapter.get('2')).toEqual({ id: '2', value: 20 });
  });

  it('should iterate over entities via entries', () => {
    const adapter = new EntityAdapter<string, number>();
    adapter.add('a', 1);
    adapter.add('b', 2);
    adapter.add('c', 3);

    const entries = adapter.entries();
    const values = entries.map(([_, value]) => value);

    expect(values).toContain(1);
    expect(values).toContain(2);
    expect(values).toContain(3);
  });

  it('should check if entity exists with has', () => {
    const adapter = new EntityAdapter<string, number>();
    adapter.add('test', 42);

    expect(adapter.has('test')).toBe(true);
    expect(adapter.has('nonexistent')).toBe(false);
  });
});
