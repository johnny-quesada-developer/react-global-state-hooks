import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PageConnectionOverlay } from '../PageConnectionOverlay';
import { pageConnection$ } from '../../../hooks/pageConnection';
import { reloadInspectedPage, retryConnection } from '../../../util/getContentScriptPort';

vi.mock('../../../util/getContentScriptPort', () => ({ reloadInspectedPage: vi.fn(), retryConnection: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  act(() => pageConnection$.actions.restart());
});

describe('PageConnectionOverlay', () => {
  it('renders nothing while waiting and once synced', () => {
    render(<PageConnectionOverlay />);
    expect(screen.queryByRole('status')).toBeNull();

    act(() => pageConnection$.actions.synced());
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows the connecting state with the attempt count', () => {
    render(<PageConnectionOverlay />);

    act(() => {
      pageConnection$.actions.connecting();
      pageConnection$.actions.attempted();
    });

    expect(screen.getByRole('status').textContent).toContain('Connecting to the page…');
    expect(screen.getByRole('status').textContent).toContain('Attempt 2 of 4');
  });

  it('offers reload and try again once the connection stalls', () => {
    render(<PageConnectionOverlay />);

    act(() => pageConnection$.actions.stalled());
    fireEvent.click(screen.getByRole('button', { name: 'Reload page' }));
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByRole('status').textContent).toContain('No stores received from the page');
    expect(reloadInspectedPage).toHaveBeenCalledTimes(1);
    expect(retryConnection).toHaveBeenCalledTimes(1);
  });
});
