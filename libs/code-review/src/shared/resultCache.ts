import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export interface ResultCache {
  keyFor: (params: { files: string[]; extra?: string }) => string;
  readPass: <T>(key: string) => T | undefined;
  rememberPass: (key: string, data: unknown) => void;
}

const hashFileContent = (file: string) =>
  fs.existsSync(file) ? crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex') : 'missing';

export function createResultCache({
  reviewDirectory,
  ruleId,
}: {
  reviewDirectory: string;
  ruleId: string;
}): ResultCache {
  const directory = path.join(reviewDirectory, 'cache', 'results', ruleId);
  const fileFor = (key: string) => path.join(directory, `${key}.json`);

  return {
    keyFor: ({ files, extra = '' }) => {
      const fingerprint = files.map((file) => `${file}:${hashFileContent(file)}`).join('\n');
      return crypto.createHash('sha1').update(`${fingerprint}\n${extra}`).digest('hex').slice(0, 20);
    },
    readPass: (key) => {
      const file = fileFor(key);
      if (!fs.existsSync(file)) return undefined;
      try {
        return JSON.parse(fs.readFileSync(file, 'utf8')).data;
      } catch {
        return undefined;
      }
    },
    rememberPass: (key, data) => {
      fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(fileFor(key), `${JSON.stringify({ at: new Date().toISOString(), data }, null, 2)}\n`);
    },
  };
}
