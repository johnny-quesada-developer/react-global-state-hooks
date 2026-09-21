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

  // Re-sync the field each time the dialog opens.
  useEffect(() => {
    if (open) setDraft(String(settings.port));
  }, [open, settings.port]);

  const draftPort = Number(draft);
  const isValid = isValidAgentPort(draftPort);

  const applyPort = () => {
    if (isValid && draftPort !== settings.port) agentSettings$.actions.setPort(draftPort);
  };

  const portFlag = settings.port === AGENT_DEFAULT_PORT ? '' : ` --port ${settings.port}`;

  return (
    <Modal open={open} onClose={onClose} dimmed={false} title="Connect a terminal or coding agent">
      <div className="flex flex-col gap-3">
        <p className="text-gray-600 dark:text-gray-400">
          Stream what happens inside your stores (actions, inputs, state changes, results, errors) to a
          terminal. Keep DevTools open on the app tab with this panel loaded.
        </p>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(event) => agentSettings$.actions.setEnabled(event.target.checked)}
          />
          Allow a terminal to connect
        </label>

        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-1"
            checked={settings.allowControl}
            disabled={!settings.enabled}
            onChange={(event) => agentSettings$.actions.setAllowControl(event.target.checked)}
          />
          <span>
            Allow the terminal to change state and run actions
            <span className="block text-xs text-gray-600 dark:text-gray-400">
              Off: the terminal can only watch. On: it can do what the State and Actions tabs do.
            </span>
          </span>
        </label>

        <label className="flex items-center gap-2">
          Port
          <input
            type="number"
            inputMode="numeric"
            min={MIN_AGENT_PORT}
            max={MAX_AGENT_PORT}
            value={draft}
            disabled={!settings.enabled}
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
          {status === 'replaced' && (
            <button type="button" className="underline" onClick={reconnectAgentBridge}>
              Reconnect
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="font-semibold">Run in your app's project</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            rgsh is installed with your state library. It also needs the ws package: <code>npm i -D ws</code>
          </p>
          <CommandLine command={'npx rgsh --help'} hint="Everything rgsh can do, and how to read its output." />
          <CommandLine command={`npx rgsh --list${portFlag}`} hint="See the stores DevTools knows about." />
          <CommandLine command={`npx rgsh${portFlag}`} hint="Pick stores interactively." />
          <CommandLine
            command={`npx rgsh --store todos,auth${portFlag}`}
            hint='Stream named stores (use "*" for all: slower and noisier).'
          />
          <CommandLine command={`npx rgsh state todos${portFlag}`} hint="Read a store's state and metadata." />
          {settings.allowControl && (
            <>
              <CommandLine
                command={`npx rgsh action todos add "Write the docs"${portFlag}`}
                hint="Run an action and print what it did."
              />
              <CommandLine
                command={`npx rgsh patch todos '{"filter":"done"}'${portFlag}`}
                hint="Merge JSON into the state (primitives replace)."
              />
              <CommandLine
                command={`npx rgsh set counter 5${portFlag}`}
                hint="Replace the whole state with JSON."
              />
            </>
          )}
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">Click outside or press Esc to close.</p>
      </div>
    </Modal>
  );
};

export default AgentConnectionModal;
