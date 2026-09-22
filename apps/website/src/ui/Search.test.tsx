import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Search } from './Search';
import { useSearchDialog } from '../state/search';

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  act(() => useSearchDialog.actions.hide());
});

describe('Search', () => {
  it('calls hide once when the dialog is closed with the Close button', () => {
    render(<Search />);
    const hide = vi.spyOn(useSearchDialog.actions, 'hide');

    act(() => useSearchDialog.actions.show());
    fireEvent.click(screen.getByRole('button', { name: 'Close', hidden: true }));

    expect(hide).toHaveBeenCalledTimes(1);
    expect(useSearchDialog.getState().open).toBe(false);
  });

  it('calls hide once when the dialog closes on its own, like the Escape key', () => {
    render(<Search />);
    const hide = vi.spyOn(useSearchDialog.actions, 'hide');

    act(() => useSearchDialog.actions.show());
    act(() => {
      document.querySelector('dialog')!.close();
    });

    expect(hide).toHaveBeenCalledTimes(1);
    expect(useSearchDialog.getState().open).toBe(false);
  });
});
