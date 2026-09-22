import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { codexProvider } from './codexProvider';

describe('codexProvider', () => {
  it('writes the json schema to a file and references it with --output-schema', () => {
    const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-analyze-'));
    const command = codexProvider.analyzeCommand({
      model: 'gpt-5.1-codex-mini',
      prompt: 'say ok',
      jsonSchema: { type: 'object', properties: { ok: { const: true } } },
      outputFile: path.join(outputDirectory, 'last-message.txt'),
    });

    const schemaIndex = command.args.indexOf('--output-schema');
    expect(schemaIndex).toBeGreaterThan(-1);
    const schemaFile = command.args[schemaIndex + 1];
    expect(fs.existsSync(schemaFile)).toBe(true);
    expect(JSON.parse(fs.readFileSync(schemaFile, 'utf8'))).toEqual({
      type: 'object',
      properties: { ok: { const: true } },
    });
    expect(command.args).toContain('--output-last-message');
  });

  it('adds --json to the edit command so parseEditLine has structured events to read', () => {
    const command = codexProvider.editCommand({
      model: 'gpt-5.1-codex',
      prompt: 'fix the bug',
      grant: { scope: 'workspace', editDirectories: ['/repo'], bashPatterns: [] },
      workspaceRoot: '/repo',
      limits: { maxBudgetUsd: 1, timeoutMs: 60_000 },
    });
    expect(command.args).toContain('--json');
    expect(command.args).toContain('--sandbox');
  });

  it('parses item events into tool activity and turn.completed into a result with token usage in the summary', () => {
    const toolLine = JSON.stringify({
      type: 'item.completed',
      item: { id: '1', type: 'command_execution', status: 'completed', command: 'yarn vitest run' },
    });
    const [toolEvent] = codexProvider.parseEditLine(toolLine);
    expect(toolEvent).toEqual({ kind: 'tool', name: 'command_execution', target: 'yarn vitest run' });

    const turnLine = JSON.stringify({
      type: 'turn.completed',
      usage: { input_tokens: 120, output_tokens: 40 },
    });
    const [resultEvent] = codexProvider.parseEditLine(turnLine);
    expect(resultEvent).toMatchObject({ kind: 'result', deniedActions: [] });
    expect((resultEvent as { summary: string }).summary).toContain('tokens in=120 out=40');
  });

  it('reports turn.failed and error events as a result carrying the failure message, never a denial', () => {
    const [failed] = codexProvider.parseEditLine(JSON.stringify({ type: 'turn.failed', message: 'sandbox denied write' }));
    expect(failed).toEqual({ kind: 'result', summary: 'sandbox denied write', deniedActions: [] });
  });

  it('falls back to a text event for lines that are not JSON, and ignores blank lines', () => {
    expect(codexProvider.parseEditLine('   ')).toEqual([]);
    expect(codexProvider.parseEditLine('plain progress output')).toEqual([
      { kind: 'text', text: 'plain progress output' },
    ]);
  });

  it('never claims to report permission denials, since no event exposes them', () => {
    expect(codexProvider.reportsPermissionDenials).toBe(false);
  });
});
