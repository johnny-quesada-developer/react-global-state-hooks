import React from 'react';
import { Modal } from '@shared/components/Modal';
import { Collapsible } from '@shared/components/Collapsible';
import loadMismatch$, { type LoadMismatch } from '@main_tab/hooks/loadMismatch';

/** Group names into `{ name, count }`, preserving first-seen order. */
const groupByName = (names: string[]): { name: string; count: number }[] => {
  const order: string[] = [];
  const counts = new Map<string, number>();

  for (const name of names) {
    if (!counts.has(name)) order.push(name);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return order.map((name) => ({ name, count: counts.get(name)! }));
};

/** "form-context" or "2 form-context" (the count is only shown when there is more than one). */
const label = ({ name, count }: { name: string; count: number }) => (count > 1 ? `${count} ${name}` : name);

/** Collapsible, name-grouped bullet list. `verb` completes "<verb> N stores" in the summary. */
const GroupedStoreList: React.FC<{ names: string[]; verb: string }> = ({ names, verb }) => {
  // Control open state here so the caret reflects it (Collapsible drives its height off `open`).
  const [open, setOpen] = React.useState(false);
  const groups = groupByName(names);

  return (
    <Collapsible
      open={open}
      className="text-gray-600 dark:text-gray-400"
      summary={() => (
        <span
          className="cursor-pointer select-none"
          onClick={(event) => {
            // The wrapper is a <summary>; prevent the native <details> toggle so `open` stays the
            // single source of truth for the animated height.
            event.preventDefault();
            setOpen((value) => !value);
          }}
        >
          {open ? '▾' : '▸'} {verb} {names.length} {names.length === 1 ? 'store' : 'stores'}
        </span>
      )}
    >
      <ul className="mt-1 max-h-40 list-disc overflow-auto pl-5">
        {groups.map((group) => (
          <li key={group.name}>{label(group)}</li>
        ))}
      </ul>
    </Collapsible>
  );
};

const Title: React.FC<{ mismatch: LoadMismatch }> = ({ mismatch }) => {
  if (mismatch.kind === 'no-live-page') return <span>This snapshot doesn&apos;t fit this page</span>;
  // Only non-restorable, nothing skipped by path.
  if (!mismatch.unconnected.length && mismatch.notRestorable.length) {
    return <span>Some values couldn&apos;t be restored</span>;
  }
  return <span>A few stores were skipped</span>;
};

const Body: React.FC<{ mismatch: LoadMismatch }> = ({ mismatch }) => {
  if (mismatch.kind === 'no-live-page') {
    return (
      <div className="flex flex-col gap-2">
        <p>None of the stores in this snapshot exist on the page, so there was nothing to restore.</p>
        <p className="text-gray-600 dark:text-gray-400">
          Make sure the app this snapshot came from is running in this tab, then load it again.
        </p>
      </div>
    );
  }

  const { connected, unconnected, notRestorable } = mismatch;
  const total = connected.length + unconnected.length;

  return (
    <div className="flex flex-col gap-2">
      {total > 0 && (
        <p>
          Restored {connected.length} of {total} stores. The others aren&apos;t on the page right now, so I
          left them out.
        </p>
      )}

      {unconnected.length > 0 && <GroupedStoreList names={unconnected} verb="Skipped" />}

      {notRestorable.length > 0 && (
        <>
          <p>
            {notRestorable.length === 1 ? 'One store' : `${notRestorable.length} stores`} had a value I
            can&apos;t send back to the page (like a function or a Map), so{' '}
            {notRestorable.length === 1 ? 'it was' : 'they were'} left as-is.
          </p>
          <GroupedStoreList names={notRestorable} verb="Couldn't restore" />
        </>
      )}
    </div>
  );
};

/**
 * Surfaces the outcome of a snapshot load when it couldn't fully connect to the running app.
 * Renders nothing until loadMismatch$ holds a report. Mount once near the panel root.
 */
export const LoadMismatchModal: React.FC = () => {
  const [mismatch] = loadMismatch$();

  const dismiss = () => loadMismatch$.actions.dismiss();

  return (
    <Modal open={mismatch != null} onClose={dismiss} title={mismatch ? <Title mismatch={mismatch} /> : null}>
      {mismatch && <Body mismatch={mismatch} />}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={dismiss}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Got it
        </button>
      </div>
    </Modal>
  );
};

export default LoadMismatchModal;
