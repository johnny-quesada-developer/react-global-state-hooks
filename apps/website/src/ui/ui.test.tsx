import { renderToString } from 'react-dom/server';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InstallCommand } from './InstallCommand';
import { usePreferences } from '../state/preferences';

beforeEach(() => {
  window.localStorage.clear();
  usePreferences.setState({ packageManager: 'npm' });
});
afterEach(cleanup);

describe('InstallCommand', () => {
  it('shows the npm command by default and switches manager on click', () => {
    render(<InstallCommand />);
    expect(screen.getByText('npm install react-global-state-hooks')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'pnpm' }));

    expect(screen.getByText('pnpm add react-global-state-hooks')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'pnpm' }).getAttribute('aria-selected')).toBe('true');
  });

  it('keeps every install box on the page in sync through the shared store', () => {
    render(
      <>
        <InstallCommand />
        <InstallCommand pkg="other" />
      </>,
    );

    fireEvent.click(screen.getAllByRole('tab', { name: 'yarn' })[0]);

    expect(screen.getByText('yarn add react-global-state-hooks')).toBeTruthy();
    expect(screen.getByText('yarn add other')).toBeTruthy();
  });

  it('moves between managers with the arrow keys', () => {
    render(<InstallCommand />);

    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' });
    expect(screen.getByText('pnpm add react-global-state-hooks')).toBeTruthy();

    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'End' });
    expect(screen.getByText('bun add react-global-state-hooks')).toBeTruthy();
  });

  it('renders the default on the server even if another manager is stored', () => {
    usePreferences.setState((current) => ({ ...current, packageManager: 'yarn' }));

    expect(renderToString(<InstallCommand />)).toContain('npm install react-global-state-hooks');
  });

  it('applies a stored choice after hydration', () => {
    usePreferences.setState((current) => ({ ...current, packageManager: 'yarn' }));

    render(<InstallCommand />);

    expect(screen.getByText('yarn add react-global-state-hooks')).toBeTruthy();
  });
});
