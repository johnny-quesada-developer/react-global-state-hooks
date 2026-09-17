import React, { useState } from 'react';
import { IoEllipsisVertical } from 'react-icons/io5';
import { LuHistory } from 'react-icons/lu';
import { FiCopy, FiDownload } from 'react-icons/fi';
import { DropdownMenu, Modal } from '@src/shared/components';
import { downloadFile, fileTimestamp } from '@src/shared/tools';
import { useSendMessagesToContentScript } from '@src/pages/main_tab/hooks/useSendMessagesToContentScript';

export type RestoreTarget = {
  globalStateId: string;
  /** Resolve the state to restore. Lazy so the caller can read the latest value at confirm time. */
  getState: () => unknown;
};

export type LogRestoreMenuProps = {
  /** Resolve what to restore when the user confirms. Returns null if it can't be resolved. */
  resolveTarget: () => RestoreTarget | null;
  className?: string;
};

/**
 * The per-log actions menu: an ellipsis trigger that opens a dropdown (portaled, so it is never
 * clipped by the scrolling log list) with a "Restore state" action. Selecting it opens a proper
 * confirmation modal instead of the native browser confirm().
 */
export const LogRestoreMenu: React.FC<LogRestoreMenuProps> = ({ resolveTarget, className = '' }) => {
  const { sendMessageToContentScript } = useSendMessagesToContentScript();
  const [confirming, setConfirming] = useState(false);

  const confirmRestore = () => {
    setConfirming(false);

    const target = resolveTarget();
    if (!target) return;

    sendMessageToContentScript({
      action: 'RESTORE_STATE',
      payload: {
        actionName: 'setState',
        globalStateId: target.globalStateId,
        state: target.getState(),
      },
    });
  };

  /** The resulting state at this log, serialized for copy/download. */
  const resultJson = (): string | null => {
    const target = resolveTarget();
    if (!target) return null;
    return JSON.stringify(target.getState() ?? null, null, 2);
  };

  const copyResult = () => {
    const json = resultJson();
    if (json == null) return;
    void navigator.clipboard?.writeText(json);
  };

  const downloadResult = () => {
    const json = resultJson();
    if (json == null) return;
    downloadFile(json, `state-${fileTimestamp()}.json`);
  };

  return (
    <>
      <DropdownMenu
        className={className}
        label="Log actions"
        trigger={<IoEllipsisVertical />}
        items={[
          {
            label: 'Restore state',
            icon: <LuHistory />,
            onSelect: () => setConfirming(true),
          },
          {
            label: 'Copy result',
            icon: <FiCopy />,
            onSelect: copyResult,
          },
          {
            label: 'Download',
            icon: <FiDownload />,
            onSelect: downloadResult,
          },
        ]}
      />

      <Modal open={confirming} onClose={() => setConfirming(false)} title="Restore this state?">
        <div className="flex flex-col gap-2 whitespace-normal">
          <p>This will update the app to this saved state.</p>
          <p className="text-gray-600 dark:text-gray-400">You can restore another state later...</p>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmRestore}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Restore
          </button>
        </div>
      </Modal>
    </>
  );
};

export default LogRestoreMenu;
