import uniqueId from 'react-global-state-hooks/uniqueId';
import * as uniqueIdNs from 'react-global-state-hooks/uniqueId';

describe('uniqueId default export (packaging regression)', () => {
  it('exposes a callable default export', () => {
    expect(typeof uniqueId).toBe('function');

    const id = uniqueId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('exposes both default and named export without phantom keys', () => {
    expect(typeof uniqueIdNs.uniqueId).toBe('function');
    expect(typeof uniqueIdNs.default).toBe('function');

    const phantom = Object.keys(uniqueIdNs).filter(
      (k) => k === 'module.exports' || k.includes('react-'),
    );
    expect(phantom).toEqual([]);
  });
});
