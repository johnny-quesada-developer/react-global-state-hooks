export const throttle = <T extends (...args: any[]) => void>(callback: T, delay: number) => {
  let lastCall = -Infinity;

  return (...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastCall >= delay) {
      lastCall = now;
      callback(...args);
    }
  };
};
