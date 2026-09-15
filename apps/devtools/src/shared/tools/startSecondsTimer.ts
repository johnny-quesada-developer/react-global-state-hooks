export const startSecondsTimer = () => {
  const start = performance.now();

  return () => {
    const end = performance.now();
    const time = end - start;

    return time / 1000;
  };
};
