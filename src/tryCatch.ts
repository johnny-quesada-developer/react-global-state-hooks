/* eslint-disable @typescript-eslint/no-explicit-any */
export type TryCatchResult<T extends (...args: any[]) => any> = {
  result: ReturnType<T> | null;
  error: unknown;
};

/**
 * Simple linear try catch utility to avoid repetitive try catch blocks
 */
function tryCatch<T extends () => any>(callback: T): TryCatchResult<T> {
  try {
    return { result: callback(), error: null };
  } catch (error) {
    return { result: null, error };
  }
}

export default tryCatch;
