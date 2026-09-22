import React from 'react';
import { isFallbackVisible, pageDiagnosis$ } from '../../hooks/pageDiagnosis';
import { reloadInspectedPage } from '../../util/getContentScriptPort';
import { checkPageNow } from '../../util/pageWatcher';

export const DOCS_URL = 'https://johnny-quesada-developer.github.io/react-global-state-hooks/docs/devtools/';

const buttonClass = 'rounded border px-3 py-1 text-sm font-medium';
const primaryClass = `${buttonClass} border-blue-600 bg-blue-600 text-white hover:bg-blue-700`;
const secondaryClass = `${buttonClass} border-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700`;

export const PageFallback: React.FC = () => {
  const [diagnosis, actions] = pageDiagnosis$.use();

  if (!isFallbackVisible(diagnosis)) return null;

  const isMissingPatch = diagnosis.problem === 'no-patch';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white p-6 dark:bg-eighties dark:text-gray-100">
      <div role="alert" className="flex w-full max-w-md flex-col items-center gap-3 text-center">
        <h2 className="text-xl font-semibold">
          {isMissingPatch ? "The debug entry isn't loaded on this page" : "This page doesn't use React"}
        </h2>

        {isMissingPatch ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            React is running here, but <code>react-global-state-hooks/debug</code> is not. Import it once at the
            top of your app&apos;s entry file (development only), then reload the page.{' '}
            <a href={DOCS_URL} target="_blank" rel="noreferrer" className="text-blue-600 underline">
              How to connect
            </a>
          </p>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            This panel shows stores created with react-global-state-hooks, so it needs a page that runs React.
            Open a React app, or check again if the page is still loading.
          </p>
        )}

        <div className="flex flex-wrap justify-center gap-2">
          {isMissingPatch && (
            <button type="button" className={primaryClass} onClick={reloadInspectedPage}>
              Reload page
            </button>
          )}
          <button type="button" className={isMissingPatch ? secondaryClass : primaryClass} onClick={checkPageNow}>
            Check again
          </button>
          <button type="button" className={secondaryClass} onClick={() => actions.showAnyway()}>
            Show anyway
          </button>
        </div>
      </div>
    </div>
  );
};

export default PageFallback;
