import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { providerCatalog } from '../providers/providerCatalog';
import { discoverProviderFiles } from './discoverProviders';

const temporaryDirectories: string[] = [];

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => fs.rmSync(directory, { recursive: true, force: true }));
});

function createProvidersDirectory(files: Record<string, string>) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'review-providers-'));
  temporaryDirectories.push(root);
  Object.entries(files).forEach(([file, content]) => {
    const fullPath = path.join(root, file);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  });
  return root;
}

const minimalProviderSource = (id: string) => `
export default {
  id: ${JSON.stringify(id)},
  label: ${JSON.stringify(id)},
  binaryNames: [${JSON.stringify(id)}],
  knownInstallLocations: () => [],
  installHint: 'install it',
  loginHint: 'login',
  models: { fast: 'fast', capable: 'capable' },
  supportsSessions: false,
  reportsPermissionDenials: false,
  async checkAuthentication() { return 'unknown'; },
  describeGrant: () => [],
  analyzeCommand: ({ model, prompt }) => ({ args: [model, prompt] }),
  readAnalyzeOutput: ({ stdout }) => ({ text: stdout }),
  editCommand: ({ model, prompt }) => ({ args: [model, prompt] }),
  parseEditLine: () => [],
};
`;

describe('discoverProviderFiles', () => {
  it('returns just the built-in catalog when no providers directory is configured or it has no files', async () => {
    const withoutDirectory = await discoverProviderFiles(undefined);
    expect(withoutDirectory.map(({ id }) => id)).toEqual(providerCatalog.map(({ id }) => id));

    const emptyDirectory = createProvidersDirectory({});
    const withEmptyDirectory = await discoverProviderFiles(emptyDirectory);
    expect(withEmptyDirectory.map(({ id }) => id)).toEqual(providerCatalog.map(({ id }) => id));
  });

  it('discovers a custom *.provider.ts file and appends it after the built-ins', async () => {
    const directory = createProvidersDirectory({
      'my-local-agent.provider.ts': minimalProviderSource('my-local-agent'),
    });

    const catalog = await discoverProviderFiles(directory);

    expect(catalog.map(({ id }) => id)).toEqual([...providerCatalog.map(({ id }) => id), 'my-local-agent']);
  });

  it('refuses a custom provider id that collides with a built-in', async () => {
    const directory = createProvidersDirectory({ 'claude.provider.ts': minimalProviderSource('claude') });

    await expect(discoverProviderFiles(directory)).rejects.toThrow(/already used by a built-in provider/);
  });

  it('refuses two custom provider files that declare the same id', async () => {
    const directory = createProvidersDirectory({
      'a.provider.ts': minimalProviderSource('duplicate-id'),
      'b.provider.ts': minimalProviderSource('duplicate-id'),
    });

    await expect(discoverProviderFiles(directory)).rejects.toThrow(/duplicate provider id/);
  });

  it('refuses a file that does not default-export a ProviderDefinition', async () => {
    const directory = createProvidersDirectory({ 'broken.provider.ts': 'export const notDefault = {};\n' });

    await expect(discoverProviderFiles(directory)).rejects.toThrow(/must default-export a ProviderDefinition/);
  });
});
