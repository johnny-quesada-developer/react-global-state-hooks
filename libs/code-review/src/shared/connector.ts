import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

export const CONNECTOR_FILE_NAME = 'review.config.json';

const ConnectorSchema = z.object({
  schemaVersion: z.literal(1),
  configurationDirectory: z.string().min(1),
});

export type Connector = z.infer<typeof ConnectorSchema>;

export interface ResolvedConnector {
  connectorPath: string;
  connector: Connector;
  configurationDirectory: string;
}

const hasGitMarker = (directory: string) => fs.existsSync(path.join(directory, '.git'));

/**
 * Walks up from `startDirectory` looking for `review.config.json`. The search never crosses a
 * repository boundary: once a directory containing `.git` is reached, that directory is checked
 * and the walk stops there (found or not) — this is the discovery boundary, deliberately not
 * "find any Nx/monorepo marker", so a plain repo with no Nx at all still works.
 */
export function findConnectorPath({ startDirectory }: { startDirectory: string }): string | undefined {
  let current = path.resolve(startDirectory);
  while (true) {
    const candidate = path.join(current, CONNECTOR_FILE_NAME);
    if (fs.existsSync(candidate)) return candidate;
    if (hasGitMarker(current)) return undefined;

    const parent = path.dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

function parseConnector({ connectorPath }: { connectorPath: string }): Connector {
  const raw = JSON.parse(fs.readFileSync(connectorPath, 'utf8'));
  const parsed = ConnectorSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ');
    throw new Error(`${connectorPath} is not a valid connector → ${issues}`);
  }
  return parsed.data;
}

export function resolveConnector({
  invocationDirectory,
  explicitConnectorPath,
}: {
  invocationDirectory: string;
  explicitConnectorPath?: string;
}): ResolvedConnector | undefined {
  const connectorPath = explicitConnectorPath
    ? path.resolve(invocationDirectory, explicitConnectorPath)
    : findConnectorPath({ startDirectory: invocationDirectory });
  if (!connectorPath) return undefined;
  if (explicitConnectorPath && !fs.existsSync(connectorPath)) {
    throw new Error(`--config ${explicitConnectorPath} does not exist (resolved to ${connectorPath})`);
  }

  const connector = parseConnector({ connectorPath });
  const configurationDirectory = path.resolve(path.dirname(connectorPath), connector.configurationDirectory);
  return { connectorPath, connector, configurationDirectory };
}

export function writeConnector({
  connectorPath,
  configurationDirectory,
}: {
  connectorPath: string;
  configurationDirectory: string;
}): Connector {
  const connector: Connector = {
    schemaVersion: 1,
    configurationDirectory: `./${path.relative(path.dirname(connectorPath), configurationDirectory).split(path.sep).join('/')}`,
  };
  fs.writeFileSync(connectorPath, `${JSON.stringify(connector, null, 2)}\n`);
  return connector;
}

export const describeMissingConnectorError = (invocationDirectory: string) =>
  `no ${CONNECTOR_FILE_NAME} found above ${invocationDirectory} (search stops at the repository root). Run \`review init\` to create one.`;
