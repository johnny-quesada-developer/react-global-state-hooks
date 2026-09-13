import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import { defineConfig } from 'eslint/config';

const $globals = {
  ...globals.browser,
  AudioWorkletGlobalScope: false,
};

// @ts-expect-error: Unable to assign to read only property
delete $globals['AudioWorkletGlobalScope '];

export default defineConfig([
  {
    // Use a directory glob for dist (minified CJS output trips no-undef on module/require,
    // no-unused-expressions, etc.). '**.js' does not reliably match nested paths in flat config.
    // Globs are prefixed with '**/' so they match build output in every workspace project
    // (libs/web/dist, libs/universal/dist, ...) now that eslint runs per-project from libs/*.
    ignores: ['**/dist/**', '**/*.d.ts', '**/coverage/**', '**/node_modules/**'],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: {
      globals: $globals,
    },
    rules: {
      // 🚫 forbid describe.only, it.only, test.only, etc.
      'no-restricted-syntax': [
        'warn',
        {
          selector:
            'CallExpression[callee.object.name="describe"][callee.property.name="only"], ' +
            'CallExpression[callee.object.name="it"][callee.property.name="only"], ' +
            'CallExpression[callee.object.name="$it"][callee.property.name="only"], ' +
            'CallExpression[callee.object.name="test"][callee.property.name="only"]',
          message: 'Remove .only from tests before committing.',
        },
      ],
    },
  },
  {
    // Node-run config files and build/test scripts: give them Node globals (process, module,
    // require, __dirname, ...). Needed now that we no longer broadly ignore *.js. Globs are
    // '**/'-prefixed so they also match per-project files (libs/web/esbuild.config.ts,
    // libs/web/scripts/**, ...) now that eslint runs from within each project.
    files: ['**/*.js', '**/*.cjs', '**/*.config.{js,cjs,mjs,ts,mts}', '**/scripts/**'],
    languageOptions: { globals: { ...globals.node } },
  },
  tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
]);
