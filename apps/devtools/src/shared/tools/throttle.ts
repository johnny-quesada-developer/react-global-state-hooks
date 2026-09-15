export const throttle = <T extends (...args: any[]) => void>(callback: T, delay: number) => {
  let lastCall: number = -Infinity;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      callback(...args);
      lastCall = now;
    }
  };
};
