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
