import React, { useEffect, useState } from 'react';
import { FiCheck, FiCopy } from 'react-icons/fi';
import { Modal } from '@shared/components/Modal';
import { cn } from '@src/shared/tools/cn';
import { AGENT_DEFAULT_PORT } from 'react-hooks-global-states-debug/agent/protocol';
import {
  agentSettings$,
  agentStatus$,
  isValidAgentPort,
  MAX_AGENT_PORT,
  MIN_AGENT_PORT,
  type AgentStatus,
} from '@main_tab/agentBridge/agentSettings';
import { reconnectAgentBridge } from '@main_tab/agentBridge/agentBridge';

export type AgentConnectionModalProps = { open: boolean; onClose: () => void };

const STATUS: Record<AgentStatus, { dot: string; text: string }> = {
  off: { dot: 'bg-gray-400', text: 'Off. No connection is attempted.' },
  waiting: { dot: 'bg-amber-400', text: 'Waiting for rgsh. Run one of the commands below.' },
  idle: { dot: 'bg-amber-400', text: 'Nothing is listening. Run one of the commands below, then focus this panel.' },
  connected: { dot: 'bg-green-500', text: 'Connected to rgsh.' },
  replaced: { dot: 'bg-red-500', text: 'Another DevTools panel took over the connection.' },
};

const CommandLine: React.FC<{ command: string; hint: string }> = ({ command, hint }) => {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void navigator.clipboard?.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between gap-2 rounded bg-gray-100 px-2 py-1 font-mono text-xs dark:bg-black/30">
        <code className="overflow-x-auto whitespace-nowrap">{command}</code>
        <button type="button" onClick={copy} title="Copy" aria-label={`Copy ${command}`} className="shrink-0">
          {copied ? <FiCheck /> : <FiCopy />}
        </button>
      </div>
      <span className="text-xs text-gray-600 dark:text-gray-400">{hint}</span>
    </div>
  );
};

/**
 * Where the terminal connection is configured. The `rgsh` command line listens on a port and this
 * panel dials it, so the port here has to match the one `rgsh` uses (`--port`).
 */
export const AgentConnectionModal: React.FC<AgentConnectionModalProps> = ({
  open,
  onClose,
}: AgentConnectionModalProps) => {
  const [settings] = agentSettings$();
  const [status] = agentStatus$();
  const [draft, setDraft] = useState(String(settings.port));

  // Re-sync the field each time the dialog opens. Opening this modal is the intent to connect,
  // so there is no separate on/off toggle: make sure the bridge is enabled.
  useEffect(() => {
    if (!open) return;
    setDraft(String(settings.port));
    if (!settings.enabled) agentSettings$.actions.setEnabled(true);
  }, [open, settings.port, settings.enabled]);

  const draftPort = Number(draft);
  const isValid = isValidAgentPort(draftPort);

  const applyPort = () => {
    if (isValid && draftPort !== settings.port) agentSettings$.actions.setPort(draftPort);
  };

  return (
    <Modal open={open} onClose={onClose} dimmed={false} title="Connect a terminal or coding agent">
      <div className="flex flex-col gap-3">
        <p className="text-gray-600 dark:text-gray-400">
          Stream what happens inside your stores (actions, inputs, state changes, results, errors) to a
          terminal. Keep DevTools open on the app tab with this panel loaded.
        </p>

        <label className="flex items-center gap-2">
          Port
          <input
            type="number"
            inputMode="numeric"
            min={MIN_AGENT_PORT}
            max={MAX_AGENT_PORT}
            value={draft}
            aria-invalid={!isValid}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={applyPort}
            onKeyDown={(event) => event.key === 'Enter' && applyPort()}
            className={cn(
              'w-24 rounded border px-2 py-0.5 text-gray-900',
              isValid ? 'border-gray-400' : 'border-red-500',
            )}
          />
          <span className="text-xs text-gray-600 dark:text-gray-400">
            default {AGENT_DEFAULT_PORT}
          </span>
        </label>
        {!isValid && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            Use a port between {MIN_AGENT_PORT} and {MAX_AGENT_PORT}.
          </p>
        )}

        <div className="flex items-center gap-2" role="status">
          <span className={cn('inline-block h-2 w-2 rounded-full', STATUS[status].dot)} />
          <span>{STATUS[status].text}</span>
          {(status === 'replaced' || status === 'idle') && (
            <button type="button" className="underline" onClick={reconnectAgentBridge}>
              {status === 'idle' ? 'Check now' : 'Reconnect'}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="font-semibold">Run in your app's project</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            rgsh is installed with your state library. It also needs the ws package: <code>npm i -D ws</code>
          </p>
          <CommandLine command="npx rgsh --help" hint="Everything rgsh can do, and how to read its output." />
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">Click outside or press Esc to close.</p>
      </div>
    </Modal>
  );
};

export default AgentConnectionModal;
