import React from 'react';
import { PAGE_CONNECTION_ATTEMPTS, pageConnection$ } from '../../hooks/pageConnection';
import { reloadInspectedPage, retryConnection } from '../../util/getContentScriptPort';

const buttonClass = 'rounded border px-3 py-1 text-sm font-medium';

export const PageConnectionOverlay: React.FC = () => {
  const [{ status, attempt }] = pageConnection$.use();

  if (status !== 'connecting' && status !== 'stalled') return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-white/60 p-4 dark:bg-black/50">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex w-full max-w-sm flex-col items-center gap-3 rounded-lg border border-gray-400 bg-white p-6 text-center shadow-xl dark:bg-eighties dark:text-gray-100"
      >
        {status === 'connecting' ? (
          <>
            <span
              aria-hidden="true"
              className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"
            />
            <p className="text-lg font-semibold">Connecting to the page…</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Waiting for the app to announce its stores. Attempt {attempt} of {PAGE_CONNECTION_ATTEMPTS}.
            </p>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold">No stores received from the page</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Reload the page to reconnect. If this stays empty, make sure the app imports{' '}
              <code>react-global-state-hooks/debug</code>.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className={`${buttonClass} border-blue-600 bg-blue-600 text-white hover:bg-blue-700`}
                onClick={reloadInspectedPage}
              >
                Reload page
              </button>
              <button
                type="button"
                className={`${buttonClass} border-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700`}
                onClick={retryConnection}
              >
                Try again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PageConnectionOverlay;
