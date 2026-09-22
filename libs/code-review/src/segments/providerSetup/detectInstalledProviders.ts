import fs from 'node:fs';
import path from 'node:path';
import { runCommand } from '../../shared/exec';
import type { AuthStatus, ProviderDefinition } from '../../providers/ProviderDefinition';

export interface DetectedProvider {
  definition: ProviderDefinition;
  isInstalled: boolean;
  binary?: string;
  version?: string;
  auth: AuthStatus;
}

const isExecutable = (file: string) => {
  try {
    fs.accessSync(file, fs.constants.X_OK);
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
};

export function findBinary({
  binaryNames,
  knownInstallLocations,
  pathEnvironment,
}: {
  binaryNames: string[];
  knownInstallLocations: string[];
  pathEnvironment: string;
}): string | undefined {
  const pathCandidates = pathEnvironment
    .split(path.delimiter)
    .filter(Boolean)
    .flatMap((directory) => binaryNames.map((name) => path.join(directory, name)));

  return [...pathCandidates, ...knownInstallLocations].find(isExecutable);
}

export async function detectInstalledProviders({
  catalog,
  workspaceRoot,
  pathEnvironment = process.env.PATH ?? '',
}: {
  catalog: ProviderDefinition[];
  workspaceRoot: string;
  pathEnvironment?: string;
}): Promise<DetectedProvider[]> {
  return Promise.all(
    catalog.map(async (definition) => {
      const binary = findBinary({
        binaryNames: definition.binaryNames,
        knownInstallLocations: definition.knownInstallLocations(),
        pathEnvironment,
      });
      if (!binary) return { definition, isInstalled: false, auth: 'unknown' } as const;

      const versionResult = await runCommand({
        command: binary,
        args: ['--version'],
        cwd: workspaceRoot,
        timeoutMs: 5_000,
      });
      const respondsToVersion = versionResult.exitCode === 0;
      if (!respondsToVersion) return { definition, isInstalled: false, binary, auth: 'unknown' } as const;

      return {
        definition,
        isInstalled: true,
        binary,
        version: versionResult.stdout.trim().split('\n')[0],
        auth: await definition.checkAuthentication({ binary, workspaceRoot }),
      };
    }),
  );
}
