export const isLocalStorageAvailable = () => {
  return !!globalThis?.localStorage;
};
