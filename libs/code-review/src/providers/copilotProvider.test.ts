import { copilotProvider } from './copilotProvider';

const grant = { scope: 'workspace' as const, editDirectories: ['/repo'], bashPatterns: ['yarn vitest *', 'git diff *'] };

describe('copilotProvider', () => {
  it('builds analyzeCommand as a read-only call that denies write and shell', () => {
    const command = copilotProvider.analyzeCommand({
      model: 'claude-sonnet-4.5',
      prompt: 'say ok',
      jsonSchema: { type: 'object' },
      outputFile: '/tmp/out.txt',
    });
    expect(command.args).toEqual(
      expect.arrayContaining(['--prompt', 'say ok', '--model', 'claude-sonnet-4.5', '--deny-tool', 'write,shell']),
    );
  });

  it('scopes editCommand with --allow-tool write plus one shell(...) entry per bash pattern', () => {
    const command = copilotProvider.editCommand({
      model: 'claude-sonnet-4.5',
      prompt: 'fix it',
      grant,
      workspaceRoot: '/repo',
      limits: { maxBudgetUsd: 1, timeoutMs: 60_000 },
    });
    expect(command.args).toEqual(
      expect.arrayContaining([
        '--allow-tool',
        'write',
        '--allow-tool',
        'shell(yarn vitest *)',
        '--allow-tool',
        'shell(git diff *)',
      ]),
    );
  });

  it('creates a new session with --name and resumes an existing one with --resume', () => {
    const created = copilotProvider.editCommand({
      model: 'm',
      prompt: 'p',
      grant,
      workspaceRoot: '/repo',
      limits: { maxBudgetUsd: 1, timeoutMs: 60_000 },
      session: { id: 'abc', hasStarted: false },
    });
    expect(created.args).toEqual(expect.arrayContaining(['--name', 'abc']));

    const resumed = copilotProvider.editCommand({
      model: 'm',
      prompt: 'p',
      grant,
      workspaceRoot: '/repo',
      limits: { maxBudgetUsd: 1, timeoutMs: 60_000 },
      session: { id: 'abc', hasStarted: true },
    });
    expect(resumed.args).toEqual(expect.arrayContaining(['--resume', 'abc']));
  });

  it('parses a JSON tool-call line and falls back to text for unstructured output', () => {
    const [toolEvent] = copilotProvider.parseEditLine(
      JSON.stringify({ type: 'tool_call', name: 'write', path: 'src/foo.ts' }),
    );
    expect(toolEvent).toEqual({ kind: 'tool', name: 'write', target: 'src/foo.ts' });

    expect(copilotProvider.parseEditLine('plain progress line')).toEqual([
      { kind: 'text', text: 'plain progress line' },
    ]);
    expect(copilotProvider.parseEditLine('')).toEqual([]);
  });

  it('never claims to report permission denials, since no event schema for it is confirmed', () => {
    expect(copilotProvider.reportsPermissionDenials).toBe(false);
  });
});
