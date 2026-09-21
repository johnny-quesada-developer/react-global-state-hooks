import { createGlobalState } from 'react-global-state-hooks/createGlobalState';
import { AGENT_DEFAULT_PORT } from 'react-hooks-global-states-debug/agent/protocol';

export type AgentSettings = {
  enabled: boolean;
  port: number;
  /** Lets the terminal change state and run actions. Off by default: reading is passive, this is not. */
  allowControl: boolean;
};

/** `off` disabled in settings, `waiting` dialing the port, `idle` nobody answered so dialing paused, `connected` an `rgsh` answered, `replaced` a newer panel took over. */
export type AgentStatus = 'off' | 'waiting' | 'idle' | 'connected' | 'replaced';

export const MIN_AGENT_PORT = 1024;
export const MAX_AGENT_PORT = 65535;

export const isValidAgentPort = (port: unknown): port is number =>
  Number.isInteger(port) && (port as number) >= MIN_AGENT_PORT && (port as number) <= MAX_AGENT_PORT;

/** Persisted in the panel's own localStorage, so the choice survives closing DevTools. */
export const agentSettings$ = createGlobalState(
  { enabled: true, port: AGENT_DEFAULT_PORT, allowControl: false } as AgentSettings,
  {
    name: 'agentSettings',
    localStorage: {
      key: 'agentSettings',
      validator: ({ restored, initial }) => {
        const value = restored as Partial<AgentSettings> | null;
        if (typeof value?.enabled !== 'boolean' || !isValidAgentPort(value.port)) return initial;
        return { enabled: value.enabled, port: value.port, allowControl: value.allowControl === true };
      },
    },
    actions: {
      setEnabled: (enabled: boolean) => {
        return ({ setState }) => setState((settings) => ({ ...settings, enabled }));
      },

      setAllowControl: (allowControl: boolean) => {
        return ({ setState }) => setState((settings) => ({ ...settings, allowControl }));
      },

      setPort: (port: number) => {
        return ({ setState }) => {
          if (!isValidAgentPort(port)) return;
          setState((settings) => ({ ...settings, port }));
        };
      },
    },
  },
);

/** What the bridge is doing right now. Written by the bridge, read by the settings dialog. */
export const agentStatus$ = createGlobalState('waiting' as AgentStatus, { name: 'agentStatus' });
