import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { claudeProvider } from '../../providers/claudeProvider';
import { codexProvider } from '../../providers/codexProvider';
import { kiroProvider } from '../../providers/kiroProvider';
import type { ProviderDefinition } from '../../providers/ProviderDefinition';
import { detectInstalledProviders } from './detectInstalledProviders';
import { rankInstalledProviders, suggestEditMode } from './recommendProvider';

const temporaryDirectories: string[] = [];

afterEach(() => {
  temporaryDirectories
    .splice(0)
    .forEach((directory) => fs.rmSync(directory, { recursive: true, force: true }));
});

const createBinDirectory = (stubs: Record<string, string>) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'review-bin-'));
  temporaryDirectories.push(directory);
  Object.entries(stubs).forEach(([name, script]) => {
    const file = path.join(directory, name);
    fs.writeFileSync(file, `#!/bin/sh\n${script}\n`);
    fs.chmodSync(file, 0o755);
  });
  return directory;
};

const onlyOnPath = (definition: ProviderDefinition): ProviderDefinition => ({
  ...definition,
  knownInstallLocations: () => [],
});
const catalogIsolatedFromThisMachine = [claudeProvider, codexProvider, kiroProvider].map(onlyOnPath);

describe('detectInstalledProviders', () => {
  it('detects binaries, versions and auth without any AI, ranks authenticated providers first and handles a fresh machine', async () => {
    const binDirectory = createBinDirectory({
      codex: 'case "$1" in --version) echo "codex-cli 1.2.0";; login) exit 0;; esac',
      claude: [
        'case "$1" in',
        '  --version) echo "2.1.0 (Claude Code)";;',
        '  auth) echo \'{"loggedIn": false}\';;',
        'esac',
      ].join('\n'),
      'kiro-cli': 'exit 3',
    });

    const detected = await detectInstalledProviders({
      catalog: catalogIsolatedFromThisMachine,
      workspaceRoot: binDirectory,
      pathEnvironment: binDirectory,
    });
    const byId = Object.fromEntries(detected.map((provider) => [provider.definition.id, provider]));

    expect(byId.claude).toMatchObject({
      isInstalled: true,
      version: '2.1.0 (Claude Code)',
      auth: 'unauthenticated',
    });
    expect(byId.codex).toMatchObject({
      isInstalled: true,
      version: 'codex-cli 1.2.0',
      auth: 'authenticated',
    });
    expect(byId.kiro).toMatchObject({ isInstalled: false });

    const ranked = rankInstalledProviders(detected);
    expect(ranked.map(({ definition }) => definition.id)).toEqual(['codex', 'claude']);
    expect(ranked[0].reason).toBe('installed + authenticated, codex-cli 1.2.0');
    expect(ranked[1].reason).toContain('run `claude auth login`');

    const freshMachine = await detectInstalledProviders({
      catalog: catalogIsolatedFromThisMachine,
      workspaceRoot: binDirectory,
      pathEnvironment: createBinDirectory({}),
    });
    expect(rankInstalledProviders(freshMachine)).toEqual([]);
  });

  it('suggests an edit mode that follows the provider permission settings', () => {
    expect(suggestEditMode('autoApproved').mode).toBe('headless');
    expect(suggestEditMode('asksForApproval').mode).toBe('interactive');
    expect(suggestEditMode('unknown')).toEqual({
      mode: 'interactive',
      reason: expect.stringContaining('could not be read'),
    });
  });
});
