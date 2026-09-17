import type { EditApproval, EditMode } from '../../providers/ProviderDefinition';
import type { DetectedProvider } from './detectInstalledProviders';

const authPriority = { authenticated: 0, unknown: 1, unauthenticated: 2 } as const;

export interface RankedProvider extends DetectedProvider {
  reason: string;
}

export function rankInstalledProviders(detected: DetectedProvider[]): RankedProvider[] {
  return detected
    .filter((provider) => provider.isInstalled)
    .map((provider, catalogIndex) => ({ provider, catalogIndex }))
    .sort((left, right) => {
      const authDifference = authPriority[left.provider.auth] - authPriority[right.provider.auth];
      return authDifference !== 0 ? authDifference : left.catalogIndex - right.catalogIndex;
    })
    .map(({ provider }) => ({ ...provider, reason: describeReadiness(provider) }));
}

function describeReadiness({ auth, version, definition }: DetectedProvider): string {
  const authLabel = {
    authenticated: 'installed + authenticated',
    unknown: 'installed (auth not verifiable)',
    unauthenticated: `installed but not logged in → run \`${definition.loginHint}\``,
  }[auth];
  return version ? `${authLabel}, ${version}` : authLabel;
}

export function suggestEditMode(editApproval: EditApproval): { mode: EditMode; reason: string } {
  if (editApproval === 'autoApproved') {
    return { mode: 'headless', reason: 'your provider settings auto-approve edits' };
  }
  if (editApproval === 'asksForApproval') {
    return {
      mode: 'interactive',
      reason: 'your provider settings ask before editing, so approvals happen in its own session',
    };
  }
  return {
    mode: 'interactive',
    reason: 'edit permissions could not be read, interactive is the safe choice',
  };
}
