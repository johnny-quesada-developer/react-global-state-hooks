import tryCatch from '../src/tryCatch';

describe('tryCatch', () => {
  it('should return result and null error when callback succeeds', () => {
    const callback = () => 'success';
    const { result, error } = tryCatch(callback);

    expect(result).toBe('success');
    expect(error).toBeNull();
  });

  it('should return null result and error when callback throws', () => {
    const testError = new Error('test error');
    const callback = () => {
      throw testError;
    };
    const { result, error } = tryCatch(callback);

    expect(result).toBeNull();
    expect(error).toBe(testError);
  });

  it('should preserve error stack trace', () => {
    const callback = () => {
      throw new Error('Stack trace test');
    };
    const { result, error } = tryCatch(callback);

    expect(result).toBeNull();
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).stack).toBeDefined();
    expect((error as Error).stack).toContain('Stack trace test');
  });
});
