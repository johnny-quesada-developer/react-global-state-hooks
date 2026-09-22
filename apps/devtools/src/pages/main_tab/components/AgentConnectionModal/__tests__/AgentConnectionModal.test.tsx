import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { AgentConnectionModal } from '../AgentConnectionModal';
import { agentSettings$, agentStatus$ } from '@main_tab/agentBridge/agentSettings';
import { AGENT_DEFAULT_PORT } from 'react-hooks-global-states-debug/agent/protocol';

beforeAll(() => {
  // jsdom has no modal <dialog> support.
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
  };
});

afterEach(() => {
  act(() => {
    agentSettings$.setState({ enabled: true, port: AGENT_DEFAULT_PORT });
    agentStatus$.setState('waiting');
  });
});

describe('AgentConnectionModal', () => {
  it('shows the connection status and the help command', () => {
    render(<AgentConnectionModal open onClose={() => undefined} />);

    expect(screen.getByRole('status').textContent).toContain('Waiting for rgsh');
    expect(screen.getByText('npx rgsh --help')).toBeTruthy();
    expect(screen.getByText(/npm i -D ws/)).toBeTruthy();

    act(() => agentStatus$.setState('connected'));
    expect(screen.getByRole('status').textContent).toContain('Connected to rgsh');
  });

  it('does not dim the page behind it, and says how to close it', () => {
    const { container } = render(<AgentConnectionModal open onClose={() => undefined} />);
    const dialog = container.querySelector('dialog')!;

    expect(dialog.className).toContain('backdrop:bg-transparent');
    expect(dialog.className).not.toContain('backdrop:bg-black');
    expect(screen.getByText('Click outside or press Esc to close.')).toBeTruthy();
  });

  it('closes when the area outside is clicked', () => {
    let closed = false;
    const { container } = render(<AgentConnectionModal open onClose={() => (closed = true)} />);

    fireEvent.click(container.querySelector('dialog')!);

    expect(closed).toBe(true);
  });

  it('saves a valid port', () => {
    render(<AgentConnectionModal open onClose={() => undefined} />);

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '8123' } });
    fireEvent.blur(input);

    expect(agentSettings$.getState().port).toBe(8123);
  });

  it('rejects an invalid port and keeps the saved one', () => {
    render(<AgentConnectionModal open onClose={() => undefined} />);

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '80' } });
    fireEvent.blur(input);

    expect(screen.getByRole('alert').textContent).toContain('between 1024 and 65535');
    expect(agentSettings$.getState().port).toBe(AGENT_DEFAULT_PORT);
  });

  it('has no on/off toggle: opening the modal enables the bridge', () => {
    act(() => agentSettings$.setState({ enabled: false, port: AGENT_DEFAULT_PORT }));

    render(<AgentConnectionModal open onClose={() => undefined} />);

    expect(screen.queryByLabelText('Allow a terminal to connect')).toBeNull();
    expect(agentSettings$.getState().enabled).toBe(true);
  });
});
