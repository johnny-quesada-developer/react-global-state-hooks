import { AGENT_DEFAULT_PORT, ALL_STORES } from '../agent/protocol';

const DEFAULT_TIMEOUT_SECONDS = 10;

/** The one-shot commands: `state`, `action`, `set` and `patch`. */
export type ControlCommand =
  | { kind: 'action'; store: string; action: string; args: unknown[] }
  | { kind: 'set'; store: string; state: unknown }
  | { kind: 'patch'; store: string; patch: unknown }
  | { kind: 'state'; store: string; path: string };

export type CliOptions = {
  /** Values of every `--store`, comma separated values split. Empty means "ask". */
  targets: string[];
  command: ControlCommand | null;
  /** How long a command waits for the page to report what it did. */
  timeoutSeconds: number;
  list: boolean;
  help: boolean;
  port: number;
};

export const HELP = `rgsh: see what happens inside your stores from a terminal, and drive them

WHAT IT DOES
  Connects to the React Global State Hooks DevTools panel and streams one block per store action:
  the store, the action and its input, the state changes it caused, the result or error, and the
  duration. Other commands read a store, run an action, or change its state.

BEFORE YOU START
  1. The app must import the debug package (import 'react-hooks-global-states/debug').
  2. Chrome has the DevTools extension, with DevTools open on the app tab and the
     react-global-state-hooks panel opened once. rgsh cannot start without it.
  3. Same port on both sides: rgsh listens on 7787 by default; change it with --port and in the
     panel under gear > Terminal connection.

DISCOVER
  rgsh --list                       every store: name or creation location, state preview, actions
  rgsh                              pick stores with the arrow keys (a list when there is no terminal)
  rgsh state <store> [path]         current state and metadata. path: todos[0].done, user.name
                                    A store is a name, or the creation location of an unnamed store
                                    (ShoppingCart.tsx:23), as printed by --list.

WATCH
  rgsh --store todos                one store
  rgsh --store todos,auth           several (comma separated, or repeat --store)
  rgsh --store "*"                  every store: DevTools does more work and the stream is much larger

CHANGE
  rgsh action <store> <name> [args...]     run an action:  rgsh action todos add "Write the docs"
  rgsh patch  <store> <json>               objects merge into the state, anything else replaces it
                                           rgsh patch todos '{"filter":"done"}'   rgsh patch counter 5
  rgsh set    <store> <json>               replace the whole state (like the State tab editor)
  Each command prints the resulting block (state changes, result or error) and exits.

VALUES
  Arguments and states are JSON: 5, true, null, {"a":1}, ["x"], "text". A plain word is text.
  A value that starts with { [ or " must be valid JSON. Never code: nothing is evaluated.
  Numbers and booleans that should be text need quotes: '"5"'.

OPTIONS
  --store, -s <names>    stores to watch
  --list, -l             list stores and exit
  --port <number>        port to listen on (default ${AGENT_DEFAULT_PORT}); must match the panel
  --timeout <seconds>    how long action/patch/set wait for the result (default ${DEFAULT_TIMEOUT_SECONDS})
  --help, -h

READING THE OUTPUT
  12:03:41.221 [todos] add("Write the docs")      time, store, action(input)
    state:                                        state (1/2), (2/2)... when the action set state several times
      todos[2]: undefined → {"id":3}              path: before → after; undefined = did not exist / removed
    result: {"ok":true}                           omitted when the action returned nothing
    error: Error: boom                            instead of result when the action threw
    duration: 6ms
  [name #2] means several live instances share that store. "setState" is a direct state change.
  "store created" / "store removed": the store appeared or disappeared (mount, unmount, reload).
  Events print when an action finishes, so a slow async action appears after it settles.

EXIT CODES
  0 done   1 failed (unknown store or action, not allowed, action threw)   2 no --store given, no terminal
  3 sent, but the page reported nothing within --timeout

GOOD TO KNOW
  - Unnamed stores are identified by where they were created; name your stores in minified builds.
  - Metadata shown by "state" is what the page announced when the store was created. Changes made
    later with setMetadata are not reported by the debug package.
  - Values that cannot be serialized (functions, DOM nodes) appear as {"__non_serializable__": ...}
    and are kept as they are when you patch or set.
  - Large values are cut with an explicit marker such as …(+120 chars) or …(+8 items).
  - Only one store at a time for action, set, patch and state. A store with several live
    instances is refused.
  - Ctrl+C stops watching; DevTools goes back to normal and the terminal work stops.`;

export class UsageError extends Error {}

/**
 * A command-line value as JSON. A word that is not JSON is text (`Ada`), but anything that looks
 * like an object, array or quoted string must parse: a typo must not silently become a string.
 */
export const parseValue = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    if (/^\s*[{["]/.test(text)) throw new UsageError(`Not valid JSON: ${text}`);
    return text;
  }
};

const parseCommand = (positionals: string[]): ControlCommand | null => {
  const [name, store, ...rest] = positionals;
  if (name === undefined) return null;

  if (name === 'action') {
    const [action, ...args] = rest;
    if (!store || !action) throw new UsageError('Usage: rgsh action <store> <action> [args...]');
    return { kind: 'action', store, action, args: args.map(parseValue) };
  }

  if (name === 'set' || name === 'patch') {
    if (!store || rest.length !== 1) throw new UsageError(`Usage: rgsh ${name} <store> <json>`);
    const value = parseValue(rest[0]);
    return name === 'set' ? { kind: 'set', store, state: value } : { kind: 'patch', store, patch: value };
  }

  if (name === 'state') {
    if (!store || rest.length > 1) throw new UsageError('Usage: rgsh state <store> [path]');
    return { kind: 'state', store, path: rest[0] ?? '' };
  }

  throw new UsageError(`Unknown command "${name}"`);
};

export const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    targets: [],
    command: null,
    timeoutSeconds: DEFAULT_TIMEOUT_SECONDS,
    list: false,
    help: false,
    port: AGENT_DEFAULT_PORT,
  };
  const positionals: string[] = [];

  const takeValue = (flag: string, inline: string | undefined, index: number): [string, number] => {
    if (inline !== undefined) return [inline, index];

    const value = argv[index + 1];
    if (value === undefined || (value.startsWith('-') && value !== ALL_STORES)) {
      throw new UsageError(`${flag} needs a value`);
    }
    return [value, index + 1];
  };

  for (let index = 0; index < argv.length; index++) {
    const [flag, inline] = argv[index].split(/=(.*)/s, 2);

    if (flag === '--help' || flag === '-h') options.help = true;
    else if (flag === '--list' || flag === '-l') options.list = true;
    else if (flag === '--store' || flag === '-s') {
      const [value, next] = takeValue(flag, inline, index);
      index = next;
      options.targets.push(...value.split(',').map((target) => target.trim()).filter(Boolean));
    } else if (flag === '--timeout') {
      const [value, next] = takeValue(flag, inline, index);
      index = next;
      options.timeoutSeconds = Number(value);
      if (!(options.timeoutSeconds > 0)) throw new UsageError(`--timeout must be a positive number, got "${value}"`);
    } else if (flag === '--port') {
      const [value, next] = takeValue(flag, inline, index);
      index = next;
      options.port = Number(value);
      if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) {
        throw new UsageError(`--port must be a number between 1 and 65535, got "${value}"`);
      }
    } else if (argv[index].startsWith('-') && argv[index] !== ALL_STORES && !/^-\d/.test(argv[index])) {
      throw new UsageError(`Unknown option "${argv[index]}"`);
    } else {
      positionals.push(argv[index]);
    }
  }

  options.command = parseCommand(positionals);
  if (options.command && options.targets.length) {
    throw new UsageError('--store does not combine with state/action/set/patch: name the store after the command');
  }

  return options;
};
