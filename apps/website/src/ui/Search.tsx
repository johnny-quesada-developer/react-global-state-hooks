import { useCallback, useEffect, useRef, useState } from 'react';
import { withBase } from '../lib/site';
import { useSearchDialog } from '../state/search';

const bundle = withBase('pagefind/');

interface PagefindUIConstructor {
  new (options: Record<string, unknown>): unknown;
}

let loading: Promise<void> | undefined;

// Static search: Pagefind indexes the built HTML (see the `build` script). The UI is fetched the first
// time the dialog opens, so pages that never search pay nothing.
function loadPagefind(mount: HTMLElement): Promise<void> {
  if (loading) return loading;

  loading = new Promise<void>((resolve, reject) => {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = `${bundle}pagefind-ui.css`;
    document.head.append(style);

    const script = document.createElement('script');
    script.src = `${bundle}pagefind-ui.js`;
    script.onload = () => {
      const { PagefindUI } = window as unknown as { PagefindUI: PagefindUIConstructor };
      new PagefindUI({
        element: mount,
        showImages: false,
        showSubResults: true,
        bundlePath: bundle,
        resetStyles: false,
      });
      resolve();
    };
    script.onerror = () => reject(new Error('search index not found'));
    document.head.append(script);
  }).catch((error: Error) => {
    loading = undefined;
    throw error;
  });

  return loading;
}

export function Search() {
  // Button, keyboard shortcut and dialog all read and write the same store.
  const [open, actions] = useSearchDialog((state) => state.open);
  const dialog = useRef<HTMLDialogElement>(null);
  const mount = useRef<HTMLDivElement>(null);
  const [unavailable, setUnavailable] = useState(false);

  // keep the <dialog> element in step with the store
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;

    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  useEffect(() => {
    if (!open || !mount.current) return;

    loadPagefind(mount.current)
      .then(() => dialog.current?.querySelector('input')?.focus())
      .catch(() => setUnavailable(true));
  }, [open]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = target.matches('input, textarea, select, [contenteditable]');
      const isShortcut =
        (event.key === '/' && !typing) ||
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k');

      if (!isShortcut) return;
      event.preventDefault();
      actions.show();
    },
    [actions],
  );

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  return (
    <>
      <button type="button" className="search-open" onClick={() => actions.show()} aria-haspopup="dialog">
        <span aria-hidden="true">⌕</span>
        <span className="search-open__label">Search docs</span>
        <kbd className="search-open__key" aria-hidden="true">
          /
        </kbd>
      </button>

      <dialog
        ref={dialog}
        className="search-dialog"
        aria-label="Search documentation"
        onClose={() => useSearchDialog.getState().open && actions.hide()}
        onClick={(event) => {
          const target = event.target as HTMLElement;
          // backdrop click, or a result link (which navigates away): close first
          if (target === dialog.current || target.closest('a')) actions.hide();
        }}
      >
        <div className="search-dialog__bar">
          <span>Search documentation</span>
          <button type="button" className="search-dialog__close" onClick={() => actions.hide()}>
            Close
          </button>
        </div>
        <div ref={mount} />
        {unavailable && (
          <p className="search-dialog__status">
            The search index was not found. Run yarn search:index (yarn dev and yarn build also create it).
          </p>
        )}
      </dialog>
    </>
  );
}
