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
    agentSettings$.setState({ enabled: true, port: AGENT_DEFAULT_PORT, allowControl: false });
    agentStatus$.setState('waiting');
  });
});

describe('AgentConnectionModal', () => {
  it('shows the connection status and the default commands', () => {
    render(<AgentConnectionModal open onClose={() => undefined} />);

    expect(screen.getByRole('status').textContent).toContain('Waiting for rgsh');
    expect(screen.getByText('npx rgsh --list')).toBeTruthy();
    expect(screen.getByText(/npm i -D ws/)).toBeTruthy();
    expect(screen.getByText('npx rgsh --store todos,auth')).toBeTruthy();

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

  it('saves a valid port and puts it in every command', () => {
    render(<AgentConnectionModal open onClose={() => undefined} />);

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '8123' } });
    fireEvent.blur(input);

    expect(agentSettings$.getState().port).toBe(8123);
    expect(screen.getByText('npx rgsh --list --port 8123')).toBeTruthy();
    expect(screen.getByText('npx rgsh --port 8123')).toBeTruthy();
  });

  it('rejects an invalid port and keeps the saved one', () => {
    render(<AgentConnectionModal open onClose={() => undefined} />);

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '80' } });
    fireEvent.blur(input);

    expect(screen.getByRole('alert').textContent).toContain('between 1024 and 65535');
    expect(agentSettings$.getState().port).toBe(AGENT_DEFAULT_PORT);
  });

  it('turns the connection off from the checkbox', () => {
    render(<AgentConnectionModal open onClose={() => undefined} />);

    fireEvent.click(screen.getByLabelText('Allow a terminal to connect'));

    expect(agentSettings$.getState().enabled).toBe(false);
  });

  it('keeps control off until it is switched on, and then shows the control commands', () => {
    render(<AgentConnectionModal open onClose={() => undefined} />);

    expect(agentSettings$.getState().allowControl).toBe(false);
    expect(screen.queryByText(/npx rgsh set counter/)).toBeNull();

    fireEvent.click(screen.getByLabelText(/Allow the terminal to change state and run actions/));

    expect(agentSettings$.getState().allowControl).toBe(true);
    expect(screen.getByText('npx rgsh set counter 5')).toBeTruthy();
    expect(screen.getByText('npx rgsh action todos add "Write the docs"')).toBeTruthy();
  });
});
