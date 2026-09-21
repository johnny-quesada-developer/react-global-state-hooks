/**
 * Store identity for agent output. Store names are optional: an unnamed store gets a generated
 * `gs:<uuid>` name (the panel UI treats it the same way), so the only human-recognisable identity
 * left is where it was created.
 */

const LIBRARY_FRAME =
  /node_modules|\/libs\/(universal|web|mobile|monkey_patch)\/|new GlobalStore|createGlobalState|createContext/;

const FRAME_LOCATION = /((?:[a-z][\w+.-]*:\/\/|\/)[^\s()]*?):(\d+):\d+\)?\s*$/i;

export const isUnnamedStore = (name: string): boolean => name.startsWith('gs:');

/**
 * `file:line` of the first application frame in the creation stack (`new Error().stack` captured
 * inside the store constructor), skipping library and dependency frames.
 */
export const getStoreLocation = (creationStack: string): string | null => {
  for (const frame of creationStack.split('\n')) {
    if (!frame.includes(':') || LIBRARY_FRAME.test(frame)) continue;

    const match = FRAME_LOCATION.exec(frame);
    if (!match) continue;

    const file = match[1].replace(/^[a-z][\w+.-]*:\/\/[^/]*/i, '').replace(/^\/+/, '');
    return `${file}:${match[2]}`;
  }

  return null;
};

type StoreIdentity = { name: string; globalStatePath: string };

/** Stable key of a store: survives HMR and remounts, unlike the generated store id. */
export const getStoreSelector = ({ name, globalStatePath }: StoreIdentity): string =>
  isUnnamedStore(name) ? `p:${globalStatePath}` : `n:${name}`;

export const getStoreLabel = ({ name, globalStatePath }: StoreIdentity): string => {
  if (!isUnnamedStore(name)) return name;

  const location = getStoreLocation(globalStatePath);
  return location ? `unnamed ${location}` : 'unnamed';
};
