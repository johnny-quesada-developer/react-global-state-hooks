import { createGlobalState } from 'react-global-state-hooks';

export const useFeed = createGlobalState(
  { items: [] as string[] },
  { metadata: { lastFetchedAt: null as number | null, requests: 0 } },
);

export function recordRequest() {
  // Changing metadata never re-renders components.
  useFeed.setMetadata((metadata) => ({ ...metadata, requests: metadata.requests + 1 }));

  return useFeed.metadata.requests;
}
