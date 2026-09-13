import type { Any, TryCatchResult } from './types';

/**
 * Simple linear try catch utility to avoid repetitive try catch blocks
 */
function tryCatch<T extends () => Any>(callback: T): TryCatchResult<T> {
  try {
    return { result: callback(), error: null };
  } catch (error) {
    return { result: null, error };
  }
}

export default tryCatch;
