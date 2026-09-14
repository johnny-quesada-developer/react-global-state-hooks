export const stringifyPayload = (payload: unknown, indent = 2): string => {
  const format = (obj: any, depth = 0): string => {
    const pad = ' '.repeat(depth * indent);

    if (obj === null) return 'null';
    if (typeof obj === 'undefined') return 'undefined';
    if (typeof obj === 'string') return `"${obj}"`;
    if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);

    if (obj.$t === 'date') {
      return `new Date("${obj.$v}")`;
    }

    if (obj.$t === 'map') {
      const mapEntries = ((obj.$v as [string, unknown][]) ?? []).map(
        ([key, value]) => `${pad}  [${format(key)}, ${format(value, depth + 1)}]`
      );

      return `new Map([\n${mapEntries.join(',\n')}\n${pad}])`;
    }

    if (obj.$t === 'set') {
      const setValues = ((obj.$v as unknown[]) ?? []).map((value) => `${pad}  ${format(value, depth + 1)}`);
      return `new Set([\n${setValues.join(',\n')}\n${pad}])`;
    }

    if (obj.$t === 'regex') {
      return `new RegExp("${obj.$v}")`;
    }

    if (obj.$t === 'error') {
      return `new Error("${obj.$v}")`;
    }

    if (obj.$t === 'function') {
      return `(${obj.$v})`;
    }

    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';

      const arrayValues = obj.map((value) => `${pad}  ${format(value, depth + 1)}`);
      return `[\n${arrayValues.join(',\n')}\n${pad}]`;
    }

    if (typeof obj === 'object') {
      const sortedKeys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
      if (sortedKeys.length === 0) return '{}';

      const formattedEntries = sortedKeys.map((key) => `${pad}  ${key}: ${format(obj[key], depth + 1)}`);
      return `{\n${formattedEntries.join(',\n')}\n${pad}}`;
    }

    return JSON.stringify(obj);
  };

  // removes the brackets from the string [1,2,3] => 1,2,3
  // this is case payloads are always store as arrays
  return format(payload).replace(/^\[|\]$/g, '');
};
