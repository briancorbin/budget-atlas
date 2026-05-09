// ESLint flat config (v9+). ESM because package.json sets "type": "module".
//
// Stack: TypeScript (strict), React 18 with the new JSX transform (no need
// for `import React`), Vite for HMR. We rely on TypeScript itself for most
// "is this code wrong" checks; ESLint's job here is the smaller set of things
// the compiler doesn't catch — Hooks rules and Vite-refresh boundaries.
//
// Prettier owns formatting. `eslint-config-prettier` is loaded last to
// disable any rules that would fight prettier.

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  // Ignore generated and vendored output. Everything else is fair game.
  {
    ignores: [
      'dist/**',
      'dist-tsbuildinfo/**',
      'build/**',
      'node_modules/**',
      '.vite/**',
      '.claude/**',
      // Marginalia is a separate project at marginalia/ with its own
      // tsconfig + (eventually) its own lint config. The Atlas's CI shouldn't
      // typecheck or lint it — that runs in a separate Cloudflare Pages
      // build out of the marginalia/ directory.
      'marginalia/**',
    ],
  },

  // Base JS recommendations.
  js.configs.recommended,

  // TypeScript recommended (non-type-checked — fast, no project parse).
  // Switch to `recommendedTypeChecked` later if you want stricter checks
  // at the cost of slower lint runs.
  ...tseslint.configs.recommended,

  // Project-wide rules tuned for this codebase.
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Vite's HMR can only refresh files that export *only* components.
      // This warns when a file mixes a component export with other exports
      // (e.g. a constant), which would silently break Fast Refresh.
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Allow intentionally-unused params/vars when prefixed with _.
      // Matches a common TS convention.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },

  // Node-side scripts: audit pipeline, build helpers. They're plain ESM
  // running under `node`, so `process`/`console`/etc. are real globals.
  // Without this block, every script gets dozens of false-positive
  // `no-undef` errors.
  {
    files: ['**/*.mjs', 'scripts/**/*.{js,mjs}', 'audit/**/*.{js,mjs}'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        // Node 18+ exposes fetch globally (used in audit/links/post-run.mjs
        // + backfill-d1.mjs to POST to the Cloudflare-hosted audit API).
        fetch: 'readonly',
      },
    },
  },

  // Disable any formatting-adjacent rules that would conflict with Prettier.
  // Must come last so it wins.
  prettierConfig,
);
