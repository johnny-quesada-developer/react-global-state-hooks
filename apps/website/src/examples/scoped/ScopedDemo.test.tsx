import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ScopedDemo } from './ScopedDemo';

afterEach(cleanup);

const panel = (name: string) => within(screen.getByRole('region', { name }));

describe('ScopedDemo', () => {
  it('each provider owns its state; value seeds the second one', () => {
    render(<ScopedDemo />);

    expect((panel('Note 1').getByLabelText('Title') as HTMLInputElement).value).toBe('Untitled note');
    expect((panel('Note 2').getByLabelText('Title') as HTMLInputElement).value).toBe('Second note');

    fireEvent.change(panel('Note 1').getByLabelText('Body'), { target: { value: 'one two three' } });

    expect(panel('Note 1').getByText('3 words')).toBeTruthy();
    expect(panel('Note 2').getByText('0 words')).toBeTruthy();
  });

  it('title edits do not re-render the body or the word count', () => {
    render(<ScopedDemo />);
    const counts = () =>
      panel('Note 1')
        .getAllByTestId('render-count')
        .map((node) => Number(node.textContent));

    expect(counts()).toEqual([1, 1, 1]);

    fireEvent.change(panel('Note 1').getByLabelText('Title'), { target: { value: 'New title' } });

    // [title, body, word count]
    expect(counts()).toEqual([2, 1, 1]);
  });

  it('removing and adding a note discards and recreates its state', () => {
    render(<ScopedDemo />);
    fireEvent.change(panel('Note 2').getByLabelText('Body'), { target: { value: 'kept?' } });

    fireEvent.click(screen.getByRole('button', { name: 'Remove last note' }));
    expect(screen.queryByRole('region', { name: 'Note 2' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Add a note' }));
    const added = screen
      .getAllByRole('region')
      .find((region) => region.getAttribute('aria-label') === 'Note 3')!;
    expect((within(added).getByLabelText('Body') as HTMLTextAreaElement).value).toBe('');
  });
});
