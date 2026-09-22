import { kiroProvider } from './kiroProvider';

describe('kiroProvider', () => {
  it('trusts the real kiro-cli tool categories (read,write,shell), not the old made-up fs_read/fs_write/execute_bash names', () => {
    const command = kiroProvider.editCommand({
      model: 'claude-sonnet-4.5',
      prompt: 'fix it',
      grant: { scope: 'workspace', editDirectories: [], bashPatterns: [] },
      workspaceRoot: '/repo',
      limits: { maxBudgetUsd: 1, timeoutMs: 60_000 },
    });
    expect(command.args).toContain('--trust-tools=read,write,shell');
    expect(command.args.join(' ')).not.toContain('fs_read');
    expect(command.args.join(' ')).not.toContain('execute_bash');
  });

  it('never claims to report permission denials, since --output-format stream-json is not wired up yet', () => {
    expect(kiroProvider.reportsPermissionDenials).toBe(false);
  });

  it('does not support sessions until create-with-a-chosen-id is confirmed', () => {
    expect(kiroProvider.supportsSessions).toBe(false);
  });
});
