import fs from 'node:fs';
import path from 'node:path';

// Run from the package directory after emitting its bundles and declarations.
const root = process.cwd();
const dist = path.join(root, 'dist');
if (!fs.existsSync(dist)) {
  console.error('dist/ does not exist. Run the build first.');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as Record<string, unknown>;
delete pkg.devDependencies;
delete pkg.scripts;
fs.writeFileSync(path.join(dist, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);

for (const file of ['README.md', 'LICENSE', 'rgsh.mjs']) {
  const source = path.join(root, file);
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(dist, file));
}

console.log('Prepared dist/ for publishing.');
