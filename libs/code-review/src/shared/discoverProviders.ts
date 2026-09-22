import fs from 'node:fs';
import path from 'node:path';
import { providerCatalog as builtInProviders } from '../providers/providerCatalog';
import type { ProviderDefinition } from '../providers/ProviderDefinition';
import { loadConsumerModule } from './loadConsumerModule';
import { walkFiles } from './workspace';

const PROVIDER_FILE = /\.provider\.(ts|js|mjs|cjs)$/;

const isProviderDefinition = (value: unknown): value is ProviderDefinition =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  'binaryNames' in value &&
  'analyzeCommand' in value &&
  'editCommand' in value &&
  'parseEditLine' in value &&
  typeof (value as ProviderDefinition).analyzeCommand === 'function' &&
  typeof (value as ProviderDefinition).editCommand === 'function';

/**
 * Discovers `<providersDirectory>/**\/*.provider.{ts,js,mjs,cjs}`, mirroring how
 * `discoverRuleFiles` finds custom rules: no registry to edit, a provider is available purely by
 * having a matching file present, sorted in deterministic order. Discovered adapters are merged
 * with the built-in catalog (claude/codex/kiro/copilot) — a custom file can't shadow a built-in id.
 */
export async function discoverProviderFiles(providersDirectory: string | undefined): Promise<ProviderDefinition[]> {
  const providerFiles = providersDirectory ? findProviderFiles(providersDirectory) : [];
  const discovered = await Promise.all(providerFiles.map((file) => loadProviderFile(file)));
  assertNoDuplicateIds({ builtIns: builtInProviders, discovered, providerFiles, providersDirectory });
  return [...builtInProviders, ...discovered];
}

function findProviderFiles(providersDirectory: string): string[] {
  if (!fs.existsSync(providersDirectory)) return [];
  return walkFiles(providersDirectory)
    .filter((file) => PROVIDER_FILE.test(file))
    .sort((left, right) =>
      path.relative(providersDirectory, left).localeCompare(path.relative(providersDirectory, right)),
    );
}

async function loadProviderFile(file: string): Promise<ProviderDefinition> {
  const exported = await loadConsumerModule<unknown>(file);
  if (!isProviderDefinition(exported)) {
    throw new Error(
      `${file} must default-export a ProviderDefinition ({ id, binaryNames, analyzeCommand, editCommand, parseEditLine, ... }); received ${describeExport(exported)}`,
    );
  }
  return exported;
}

const describeExport = (value: unknown) => (value === undefined ? 'undefined (missing "export default")' : typeof value);

function assertNoDuplicateIds({
  builtIns,
  discovered,
  providerFiles,
  providersDirectory,
}: {
  builtIns: ProviderDefinition[];
  discovered: ProviderDefinition[];
  providerFiles: string[];
  providersDirectory: string | undefined;
}): void {
  const shadowsBuiltIn = discovered.filter((provider) => builtIns.some(({ id }) => id === provider.id));
  if (shadowsBuiltIn.length) {
    throw new Error(
      `provider id(s) already used by a built-in provider: ${shadowsBuiltIn.map(({ id }) => id).join(', ')} (in ${providersDirectory}); choose a different id`,
    );
  }

  const filesById = new Map<string, string[]>();
  discovered.forEach((provider, index) => {
    filesById.set(provider.id, [...(filesById.get(provider.id) ?? []), providerFiles[index]]);
  });
  const duplicates = [...filesById.entries()].filter(([, files]) => files.length > 1);
  if (duplicates.length) {
    const description = duplicates.map(([id, files]) => `"${id}" in ${files.join(' and ')}`).join('; ');
    throw new Error(`duplicate provider id(s): ${description}`);
  }
}
