import React from 'react';
import { pageDiagnosis$, shouldSuggestReactDevTools } from '../../hooks/pageDiagnosis';

export const REACT_DEVTOOLS_URL =
  'https://chromewebstore.google.com/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi';

export const ReactDevToolsNotice: React.FC = () => {
  const [diagnosis, actions] = pageDiagnosis$.use();

  if (!shouldSuggestReactDevTools(diagnosis)) return null;

  return (
    <div
      role="note"
      className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-gray-400 bg-yellow-50 px-3 py-2 text-xs text-gray-800 dark:bg-gray-800 dark:text-gray-100"
    >
      <p className="flex-1">
        For full compatibility, install React DevTools. Without it, stores created inside components could
        stay listed after they unmount.
      </p>
      <a
        href={REACT_DEVTOOLS_URL}
        target="_blank"
        rel="noreferrer"
        className="rounded border border-blue-600 px-2 py-0.5 font-medium text-blue-600 hover:bg-blue-50"
      >
        Install React DevTools
      </a>
      <button
        type="button"
        aria-label="Dismiss"
        className="px-1 text-base leading-none"
        onClick={() => actions.dismissReactDevToolsNotice()}
      >
        ×
      </button>
    </div>
  );
};

export default ReactDevToolsNotice;
