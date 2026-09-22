// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

describe('debug patch without a window', () => {
  it('loads without throwing and installs nothing', async () => {
    expect(typeof window).toBe('undefined');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(import('../src/debug')).resolves.toBeDefined();

    expect(consoleError).not.toHaveBeenCalled();
    expect((globalThis as { REACT_GLOBAL_STATE_HOOK_DEBUG?: unknown }).REACT_GLOBAL_STATE_HOOK_DEBUG).toBeUndefined();
  });
});
