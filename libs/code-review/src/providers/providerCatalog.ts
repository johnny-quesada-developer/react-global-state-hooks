import { claudeProvider } from './claudeProvider';
import { codexProvider } from './codexProvider';
import { kiroProvider } from './kiroProvider';
import type { ProviderDefinition, ProviderId } from './ProviderDefinition';

export const providerCatalog: ProviderDefinition[] = [claudeProvider, codexProvider, kiroProvider];

export const findProviderDefinition = (id: ProviderId) =>
  providerCatalog.find((definition) => definition.id === id);
