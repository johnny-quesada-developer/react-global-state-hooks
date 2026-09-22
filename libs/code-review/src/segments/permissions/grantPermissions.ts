import path from 'node:path';
import type { ReviewContext } from '../../pipeline/ReviewContext';
import type { PermissionGrant, PermissionScope } from '../../providers/ProviderDefinition';
import { rememberChoices } from '../../shared/reviewConfig';
import { findOwningPackageRoot } from '../../shared/workspace';
import type { ProviderChoice } from '../providerSetup/providerSetupGraph';

export function buildGrant({
  scope,
  files,
  workspaceRoot,
  bashPatterns,
}: {
  scope: PermissionScope;
  files: string[];
  workspaceRoot: string;
  bashPatterns: string[];
}): PermissionGrant {
  const projectRoots = [
    ...new Set(files.map((file) => findOwningPackageRoot({ file, workspaceRoot }))),
  ].sort();
  return {
    scope,
    editDirectories: scope === 'workspace' ? [workspaceRoot] : projectRoots,
    bashPatterns,
  };
}

export async function grantPermissions({
  context,
  choice,
  files,
}: {
  context: ReviewContext;
  choice: ProviderChoice;
  files: string[];
}): Promise<PermissionGrant> {
  const { workspaceRoot, ask, logger, options, settings } = context;
  const bashPatterns = settings.permissions.bash;
  const toGrant = (scope: PermissionScope) => buildGrant({ scope, files, workspaceRoot, bashPatterns });
  const projectLabels = toGrant('projects').editDirectories.map(
    (directory) => path.relative(workspaceRoot, directory) || '.',
  );

  const scope =
    options.permissions ??
    (await ask.select<PermissionScope>({
      message:
        'Which edit permissions should the agent get for this run? (enforced by the provider, not by the pipeline)',
      defaultValue: 'workspace',
      choices: [
        {
          value: 'workspace',
          label: 'Whole workspace (recommended)',
          hint: 'the review target is not an edit boundary: barrels, configs, shared helpers can be fixed',
        },
        {
          value: 'projects',
          label: `Only the target project(s): ${projectLabels.join(', ')}`,
          hint: 'safer, but changes needed outside these folders will be denied',
        },
      ],
    }));

  const grant = toGrant(scope);
  rememberChoices({ workspaceRoot, patch: { permissions: scope, concurrency: options.concurrency } });
  logger.step(`permissions granted (${scope}) → ${choice.label} will run with:`);
  choice.describeGrant(grant).forEach((line) => logger.detail(line));
  return grant;
}
