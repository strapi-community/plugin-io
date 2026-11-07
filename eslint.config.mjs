/**
 * ESLint flat config (ESLint 10).
 *
 * - @eslint/js recommended rules everywhere.
 * - Admin (React, browser, ESM): JSX parsing and eslint-plugin-react-hooks.
 * - Server (Node, ESM sources bundled by @strapi/sdk-plugin).
 * - Tests and tooling: Node globals.
 * - eslint-config-prettier last, so ESLint never fights Prettier.
 *
 * eslint-plugin-react and eslint-plugin-jsx-a11y are not used: their latest
 * releases declare peer support only up to ESLint 9. Accessibility is covered
 * by tests/admin-source-contract.test.mjs and the browser acceptance run.
 */
import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';

const unusedVars = ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }];

export default defineConfig([
  globalIgnores(['dist/**', 'node_modules/**', 'pics/**', 'coverage/**', 'docs/**', '.strapi/**', 'output/**']),

  {
    name: 'io/recommended',
    files: ['**/*.{js,jsx,mjs,cjs}'],
    extends: [js.configs.recommended],
    rules: {
      'no-unused-vars': unusedVars,
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },

  {
    name: 'io/admin',
    files: ['admin/**/*.{js,jsx,mjs}'],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    rules: {
      'no-console': ['error', { allow: ['error'] }],
    },
  },

  {
    name: 'io/server',
    files: ['server/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, strapi: 'readonly' },
    },
    rules: {
      'no-console': 'error',
    },
  },

  {
    name: 'io/node-tooling',
    files: ['tests/**/*.{js,cjs,mjs}', 'scripts/**/*.{js,cjs,mjs}', '*.config.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },

  eslintConfigPrettier,
]);
