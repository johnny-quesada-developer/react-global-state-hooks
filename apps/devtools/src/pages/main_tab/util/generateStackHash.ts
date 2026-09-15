const BASE62_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

const hashToBase62 = (hash: number): string => {
  let result = '';
  while (hash > 0) {
    result = BASE62_ALPHABET[hash % 62] + result;
    hash = Math.floor(hash / 62);
  }
  return result || '0';
};

export const generateStackHash = (stack: string): string => {
  if (!stack.trim()) return 'unknown';

  stack = stack.replace(/\s/g, '');
  let hash = 2166136261;

  for (let i = 0; i < stack.length; i++) {
    hash ^= stack.charCodeAt(i);
    hash *= 16777619;
    hash &= 0xffffffff;
  }

  return hashToBase62(hash >>> 0);
};

export default generateStackHash;
