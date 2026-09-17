/**
 * Trigger a browser download of `content` as a file named `filename`. Creates a Blob, clicks a
 * temporary anchor, and revokes the object URL. Used for exporting snapshots and per-log state.
 */
export const downloadFile = (content: string, filename: string, mimeType = 'application/json'): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
};

/** A filesystem-safe timestamp for filenames, e.g. 2026-09-17T21-03-05-123Z. */
export const fileTimestamp = (): string => new Date().toISOString().replace(/[:.]/g, '-');
