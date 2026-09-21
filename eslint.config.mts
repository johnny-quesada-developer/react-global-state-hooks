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
    ignores: ['**/dist/**', '**/dist-cli/**', '**/*.d.ts', '**/coverage/**', '**/node_modules/**'],
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
  {
    // Standard convention: an underscore prefix marks an intentionally-unused ARGUMENT
    // (e.g. a mock/callback parameter that exists only to define arity/shape). Unused local
    // variables are still reported (so dead code is caught). Caught errors that go unused are
    // allowed (a bare `catch {}` is preferred, but `catch (e) {}` without using `e` is fine).
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
  {
    // The base library (universal) intentionally uses `{}` in a few generic/utility type
    // positions and disabled this rule globally in its pre-monorepo config. The shared test
    // suite (extracted from universal's tests) inherits the same `{}` usage. Scope the override
    // to those two so web keeps flagging `{}` (web disables it inline per-line, and a
    // workspace-wide off would turn those inline directives into "unused" warnings).
    files: ['libs/universal/**/*.{ts,tsx}', 'libs/test/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  {
    // The playground app uses the modern JSX transform (tsconfig `jsx: react-jsx`), so components
    // don't import React. Turn off the legacy "React must be in scope" rule for apps and pin the
    // React version so eslint-plugin-react stops warning it can't detect it.
    files: ['apps/**/*.{ts,tsx}'],
    settings: { react: { version: 'detect' } },
    rules: {
      'react/react-in-jsx-scope': 'off',
      // Playground UI copy contains quotes/apostrophes; escaping them adds noise for no benefit.
      'react/no-unescaped-entities': 'off',
    },
  },
  {
    // The DevTools app is a browser-extension dev tool that inspects ARBITRARY runtime state
    // (Chrome APIs, user stores, serialized messages), where `any` is often the honest type. It
    // was also authored against its own (looser) lint config. Relax the rules that would
    // otherwise produce a large amount of low-value churn, while keeping the rest of the
    // shared config active.
    files: ['apps/devtools/**/*.{ts,tsx,cjs,js,mjs}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      // TS types the props; the plugin's runtime prop-types / display-name checks are redundant noise here.
      'react/prop-types': 'off',
      'react/display-name': 'off',
    },
  },
]);
