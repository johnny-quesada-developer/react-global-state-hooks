import { describe, it, expect, beforeAll, afterEach } from 'vitest';

beforeAll(() => {
  (window as unknown as { matchMedia: unknown }).matchMedia ??= () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  });
});

const setup = async () => {
  const rtl = await import('@testing-library/react');
  afterEach(() => rtl.cleanup());
  return rtl;
};

describe('FormContextPanel (multi-instance context)', () => {
  it('adds and removes context instances', async () => {
    const { render, within, fireEvent } = await setup();
    const { FormContextPanel } = await import('./FormContextPanel');

    const { container } = render(<FormContextPanel />);
    const panel = within(container);

    expect(panel.getByText('1 mounted')).toBeTruthy();

    fireEvent.click(panel.getByText('add instance'));
    fireEvent.click(panel.getByText('add instance'));
    expect(panel.getByText('3 mounted')).toBeTruthy();

    fireEvent.click(panel.getAllByText('remove')[0]);
    expect(panel.getByText('2 mounted')).toBeTruthy();
  });
});

describe('ScopedCounterPanel (createGlobalState in useMemo)', () => {
  it('adds and removes scoped counter instances', async () => {
    const { render, within, fireEvent } = await setup();
    const { ScopedCounterPanel } = await import('./ScopedCounterPanel');

    const { container } = render(<ScopedCounterPanel />);
    const panel = within(container);

    expect(panel.getByText('1 mounted')).toBeTruthy();

    fireEvent.click(panel.getByText('add instance'));
    expect(panel.getByText('2 mounted')).toBeTruthy();

    fireEvent.click(panel.getAllByText('remove')[0]);
    expect(panel.getByText('1 mounted')).toBeTruthy();
  });
});
