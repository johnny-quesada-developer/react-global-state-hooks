#!/usr/bin/env node
import { HELP, parseArgs, UsageError } from './args';
import { EXIT, run } from './run';
import { pickStores } from './select';

const main = async (): Promise<number> => {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    process.stderr.write(`\n\n\n${error.message}\n\n${HELP}\n`);
    return EXIT.failed;
  }

  if (options.help) {
    // Blank lines first: a package manager banner or warning above stays out of the way.
    process.stdout.write(`\n\n\n${HELP}\n`);
    return EXIT.ok;
  }

  const controller = new AbortController();
  process.once('SIGINT', () => controller.abort());
  process.once('SIGTERM', () => controller.abort());

  // A closed pipe (`rgsh | head`) is a normal way to stop.
  process.stdout.on('error', () => controller.abort());

  return run(
    options,
    {
      out: (text) => void process.stdout.write(text),
      err: (text) => void process.stderr.write(`${text}\n`),
      interactive: Boolean(process.stdin.isTTY && process.stdout.isTTY),
      pick: pickStores,
    },
    controller.signal,
  );
};

main().then(
  (code) => process.exit(code),
  (error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exit(EXIT.failed);
  },
);
