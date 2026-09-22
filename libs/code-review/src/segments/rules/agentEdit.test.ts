import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AgentProvider, EditOutcome } from '../../providers/AgentProvider';
import { createLogger, type LogEvent } from '../../shared/logger';
import { runAgentEdit } from './agentEdit';

const temporaryDirectories: string[] = [];

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => fs.rmSync(directory, { recursive: true, force: true }));
});

function createRepository() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'review-agent-edit-')));
  temporaryDirectories.push(root);
  execFileSync('git', ['init', '-q'], { cwd: root });
  return root;
}

const fakeProviderReturning = (outcome: EditOutcome, reportsPermissionDenials: boolean): AgentProvider => ({
  id: 'fake',
  label: 'Fake',
  models: { fast: 'f', capable: 'c' },
  grant: { scope: 'workspace', editDirectories: [], bashPatterns: [] },
  supportsSessions: false,
  reportsPermissionDenials,
  analyze: async () => '',
  edit: async () => outcome,
});

const collectWarnings = () => {
  const events: LogEvent[] = [];
  const logger = createLogger({ sinks: [(event) => events.push(event)], write: () => undefined });
  return { logger, warnings: () => events.filter((event) => event.level === 'warn').map((event) => event.message) };
};

describe('runAgentEdit', () => {
  it('warns when nothing changed and the provider cannot report whether permissions blocked the edit', async () => {
    const workspaceRoot = createRepository();
    const provider = fakeProviderReturning(
      { exitCode: 0, summary: 'done', deniedActions: [], usage: { durationMs: 0 } },
      false,
    );
    const { logger, warnings } = collectWarnings();

    await runAgentEdit({ provider, task: 'edit', prompt: 'p', workspaceRoot, logger });

    expect(warnings()).toEqual([expect.stringContaining("can't report whether permissions blocked the edit")]);
  });

  it('does not warn when the provider genuinely reports zero denials', async () => {
    const workspaceRoot = createRepository();
    const provider = fakeProviderReturning(
      { exitCode: 0, summary: 'done', deniedActions: [], usage: { durationMs: 0 } },
      true,
    );
    const { logger, warnings } = collectWarnings();

    await runAgentEdit({ provider, task: 'edit', prompt: 'p', workspaceRoot, logger });

    expect(warnings()).toEqual([]);
  });

  it('does not warn when the provider did report a denial', async () => {
    const workspaceRoot = createRepository();
    const provider = fakeProviderReturning(
      { exitCode: 0, summary: 'done', deniedActions: ['Write src/x.ts'], usage: { durationMs: 0 } },
      false,
    );
    const { logger, warnings } = collectWarnings();

    await runAgentEdit({ provider, task: 'edit', prompt: 'p', workspaceRoot, logger });

    expect(warnings()).toEqual([]);
  });
});
