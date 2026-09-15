import { describe, it, expect } from 'vitest';
import { generateStackHash } from '../generateStackHash';

describe('generateStackHash', () => {
  describe('basic functionality', () => {
    it('should generate hash for simple stack trace', () => {
      const stack = 'Error: test\n    at Object.<anonymous> (file.ts:10:5)';
      const hash = generateStackHash(stack);

      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should return consistent hash for same input', () => {
      const stack = 'Error: test\n    at func (file.ts:10:5)';
      const hash1 = generateStackHash(stack);
      const hash2 = generateStackHash(stack);

      expect(hash1).toBe(hash2);
    });

    it('should return different hashes for different inputs', () => {
      const stack1 = 'Error: test1\n    at func (file.ts:10:5)';
      const stack2 = 'Error: test2\n    at func (file.ts:10:5)';
      const hash1 = generateStackHash(stack1);
      const hash2 = generateStackHash(stack2);

      expect(hash1).not.toBe(hash2);
    });

    it('should use base62 encoding', () => {
      const stack = 'Error: test';
      const hash = generateStackHash(stack);
      const base62Regex = /^[0-9a-zA-Z]+$/;

      expect(hash).toMatch(base62Regex);
    });
  });

  describe('edge cases', () => {
    it('should return "unknown" for empty string', () => {
      expect(generateStackHash('')).toBe('unknown');
    });

    it('should return "unknown" for whitespace-only string', () => {
      expect(generateStackHash('   ')).toBe('unknown');
      expect(generateStackHash('\n\n')).toBe('unknown');
      expect(generateStackHash('\t\t')).toBe('unknown');
      expect(generateStackHash('  \n  \t  ')).toBe('unknown');
    });

    it('should handle very long stack traces', () => {
      const longStack = 'Error: test\n' + '    at func (file.ts:10:5)\n'.repeat(100);
      const hash = generateStackHash(longStack);

      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
    });

    it('should handle single character input', () => {
      const hash = generateStackHash('a');
      expect(hash).toBeTruthy();
      expect(hash).not.toBe('unknown');
    });

    it('should handle stack with only error message', () => {
      const stack = 'Error: Something went wrong';
      const hash = generateStackHash(stack);

      expect(hash).toBeTruthy();
      expect(hash).not.toBe('unknown');
    });
  });

  describe('whitespace handling', () => {
    it('should ignore all whitespace differences', () => {
      const stack1 = 'Error: test\n    at func (file.ts:10:5)';
      const stack2 = 'Error:test\natfunc(file.ts:10:5)';
      const hash1 = generateStackHash(stack1);
      const hash2 = generateStackHash(stack2);

      expect(hash1).toBe(hash2);
    });

    it('should treat tabs and spaces the same', () => {
      const stack1 = 'Error: test    at func';
      const stack2 = 'Error: test\tat func';
      const hash1 = generateStackHash(stack1);
      const hash2 = generateStackHash(stack2);

      expect(hash1).toBe(hash2);
    });

    it('should ignore leading and trailing whitespace', () => {
      const stack1 = '  Error: test  ';
      const stack2 = 'Error: test';
      const hash1 = generateStackHash(stack1);
      const hash2 = generateStackHash(stack2);

      expect(hash1).toBe(hash2);
    });

    it('should ignore newlines', () => {
      const stack1 = 'Error:\ntest\nat\nfunc';
      const stack2 = 'Error:testatfunc';
      const hash1 = generateStackHash(stack1);
      const hash2 = generateStackHash(stack2);

      expect(hash1).toBe(hash2);
    });
  });

  describe('special characters', () => {
    it('should handle special characters in stack trace', () => {
      const stack = 'Error: test@#$%^&*()';
      const hash = generateStackHash(stack);

      expect(hash).toBeTruthy();
      expect(hash).not.toBe('unknown');
    });

    it('should handle unicode characters', () => {
      const stack = 'Error: тест ошибка 错误';
      const hash = generateStackHash(stack);

      expect(hash).toBeTruthy();
      expect(hash).not.toBe('unknown');
    });

    it('should handle emojis', () => {
      const stack = 'Error: 😀 🎉 ❌';
      const hash = generateStackHash(stack);

      expect(hash).toBeTruthy();
      expect(hash).not.toBe('unknown');
    });

    it('should differentiate between similar special characters', () => {
      const stack1 = 'Error: test!';
      const stack2 = 'Error: test?';
      const hash1 = generateStackHash(stack1);
      const hash2 = generateStackHash(stack2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('real-world stack traces', () => {
    it('should hash typical JavaScript error stack', () => {
      const stack = `Error: Network timeout
    at fetch (http://localhost:3000/api.js:42:15)
    at async getData (http://localhost:3000/service.js:10:20)
    at async Component (http://localhost:3000/Component.tsx:5:12)`;

      const hash = generateStackHash(stack);
      expect(hash).toBeTruthy();
      expect(hash).not.toBe('unknown');
    });

    it('should hash React error stack', () => {
      const stack = `Error: Minified React error #31
    at throwInvalidHookError (react-dom.development.js:15231:9)
    at renderWithHooks (react-dom.development.js:16260:7)
    at updateFunctionComponent (react-dom.development.js:19588:20)`;

      const hash = generateStackHash(stack);
      expect(hash).toBeTruthy();
    });

    it('should hash webpack/bundler stack', () => {
      const stack = `Error: Module not found
    at compilation.hooks.finishModules.tapPromise.modules (webpack:///./node_modules/webpack/lib/Compilation.js:1423:0)
    at Hook.eval [as callAsync] (eval at create (webpack:///./node_modules/tapable/lib/HookCodeFactory.js:33:10))`;

      const hash = generateStackHash(stack);
      expect(hash).toBeTruthy();
    });

    it('should produce different hashes for errors at different lines', () => {
      const stack1 = 'Error: test\n    at func (file.ts:10:5)';
      const stack2 = 'Error: test\n    at func (file.ts:20:5)';
      const hash1 = generateStackHash(stack1);
      const hash2 = generateStackHash(stack2);

      expect(hash1).not.toBe(hash2);
    });

    it('should produce same hash for similar stack patterns', () => {
      const stack1 = 'Error\nat func1 (file.ts:10:5)\nat func2 (file.ts:20:5)';
      const stack2 = 'Error\nat func1(file.ts:10:5)\nat func2(file.ts:20:5)';
      const hash1 = generateStackHash(stack1);
      const hash2 = generateStackHash(stack2);

      expect(hash1).toBe(hash2);
    });
  });

  describe('hash distribution', () => {
    it('should generate different hashes for sequential inputs', () => {
      const hashes = new Set();

      for (let i = 0; i < 100; i++) {
        const hash = generateStackHash(`Error: test ${i}`);
        hashes.add(hash);
      }

      // Should have 100 unique hashes
      expect(hashes.size).toBe(100);
    });

    it('should not produce "0" hash unless input is edge case', () => {
      const stack = 'Error: normal stack trace';
      const hash = generateStackHash(stack);

      // For a normal stack, should not be just "0"
      expect(hash).not.toBe('0');
    });

    it('should handle collision-prone inputs', () => {
      const stack1 = 'ab';
      const stack2 = 'ba';
      const hash1 = generateStackHash(stack1);
      const hash2 = generateStackHash(stack2);

      // Different strings should produce different hashes
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('hash format', () => {
    it('should return base62-encoded string', () => {
      const stack = 'Error: test';
      const hash = generateStackHash(stack);

      // Should only contain base62 characters: 0-9, a-z, A-Z
      expect(/^[0-9a-zA-Z]+$/.test(hash)).toBe(true);
    });

    it('should return reasonable length hashes', () => {
      const stack = 'Error: test error message';
      const hash = generateStackHash(stack);

      // Hash should be reasonably short (base62 is compact)
      expect(hash.length).toBeLessThan(20);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should handle maximum 32-bit hash value', () => {
      // Create a string that might produce max hash
      const stack = Array(1000).fill('z').join('');
      const hash = generateStackHash(stack);

      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
    });
  });

  describe('performance characteristics', () => {
    it('should handle very long inputs efficiently', () => {
      const longStack = 'Error: test\n' + 'x'.repeat(10000);
      const start = Date.now();
      const hash = generateStackHash(longStack);
      const duration = Date.now() - start;

      expect(hash).toBeTruthy();
      // Should complete in reasonable time (< 100ms)
      expect(duration).toBeLessThan(100);
    });

    it('should be deterministic', () => {
      const stack = 'Error: consistency test';
      const hashes = Array(10)
        .fill(null)
        .map(() => generateStackHash(stack));

      // All hashes should be identical
      expect(new Set(hashes).size).toBe(1);
    });
  });
});
