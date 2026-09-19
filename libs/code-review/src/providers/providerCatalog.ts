import { claudeProvider } from './claudeProvider';
import { codexProvider } from './codexProvider';
import { copilotProvider } from './copilotProvider';
import { kiroProvider } from './kiroProvider';
import type { ProviderDefinition, ProviderId } from './ProviderDefinition';

/** Built-ins only. `discoverProviderFiles` (shared/discoverProviders.ts) adds any custom adapters on top. */
export const providerCatalog: ProviderDefinition[] = [claudeProvider, codexProvider, kiroProvider, copilotProvider];

export const findProviderDefinition = (id: ProviderId, catalog: ProviderDefinition[] = providerCatalog) =>
  catalog.find((definition) => definition.id === id);
