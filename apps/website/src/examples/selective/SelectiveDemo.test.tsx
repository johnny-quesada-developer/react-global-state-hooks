import { StrictMode } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SelectiveDemo } from './SelectiveDemo';
import { useProfile } from './store';

const counts = () => {
  const read = (label: string) =>
    Number(within(screen.getByRole('region', { name: label })).getByTestId('render-count').textContent);

  return {
    name: read('Name card'),
    role: read('Role card'),
    clicks: read('Clicks card'),
    whole: read('Whole state card'),
  };
};

afterEach(() => {
  cleanup();
  useProfile.reset();
});

describe.each([
  ['plain render', (ui: React.ReactElement) => ui],
  ['React.StrictMode', (ui: React.ReactElement) => <StrictMode>{ui}</StrictMode>],
])('SelectiveDemo (%s)', (_label, wrap) => {
  it('starts every component at one render', () => {
    render(wrap(<SelectiveDemo />));

    expect(counts()).toEqual({ name: 1, role: 1, clicks: 1, whole: 1 });
  });

  it('re-renders only the components that select the changed slice', () => {
    render(wrap(<SelectiveDemo />));

    fireEvent.click(screen.getByRole('button', { name: /clicked 0 times/i }));
    expect(counts()).toEqual({ name: 1, role: 1, clicks: 2, whole: 2 });

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Grace' } });
    expect(counts()).toEqual({ name: 2, role: 1, clicks: 2, whole: 3 });

    fireEvent.click(screen.getByLabelText('Designer'));
    expect(counts()).toEqual({ name: 2, role: 2, clicks: 2, whole: 4 });
  });

  it('does not re-render anything when the state is set to an identical value', () => {
    render(wrap(<SelectiveDemo />));

    useProfile.setState((profile) => profile);
    expect(counts()).toEqual({ name: 1, role: 1, clicks: 1, whole: 1 });
  });

  it('reset restores the state and the counters', () => {
    render(wrap(<SelectiveDemo />));

    fireEvent.click(screen.getByRole('button', { name: /clicked 0 times/i }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Grace' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset demo' }));

    expect(useProfile.getState()).toEqual({ name: 'Ada', role: 'Engineer', clicks: 0 });
    expect(screen.getByLabelText('Name')).toHaveProperty('value', 'Ada');
    expect(counts()).toEqual({ name: 1, role: 1, clicks: 1, whole: 1 });
  });
});
