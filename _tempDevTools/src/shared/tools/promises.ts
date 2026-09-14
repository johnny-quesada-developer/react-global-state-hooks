import { CancelablePromise } from 'easy-cancelable-promise';

export const wait = (ms: number) =>
  new CancelablePromise((resolve, _, { onCancel }) => {
    const timeId = setTimeout(resolve, ms);

    onCancel(() => {
      clearTimeout(timeId);
    });
  });
