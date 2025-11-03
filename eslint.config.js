import { baseConfig } from './packages/config/eslint.config.base.js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    ignores: ['.product/**', '**/.next/**'],
  },
  // Override base config to only lint specific directories from root
  {
    files: ['apps/**/*.ts', 'apps/**/*.tsx', 'packages/**/*.ts', 'packages/**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        // Node globals
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        HTMLElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLInputElement: 'readonly',
        Element: 'readonly',
        Node: 'readonly',
        Event: 'readonly',
        // Test globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
        performance: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...jsxA11yPlugin.configs.recommended.rules,
      quotes: ['error', 'single', { avoidEscape: true }],
      'comma-dangle': ['error', 'always-multiline'],
      'no-var': 'error',
      'prefer-const': 'error',
      'object-shorthand': ['error', 'always'],
      'prefer-arrow-callback': 'error',
      'func-style': ['error', 'expression', { allowArrowFunctions: true }],
      'no-param-reassign': ['error', { props: true }],
      'no-restricted-syntax': [
        'error',
        { selector: 'ClassDeclaration', message: 'Avoid classes; prefer functions and hooks.' },
        { selector: 'ClassExpression', message: 'Avoid classes; prefer functions and hooks.' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      'react/function-component-definition': [
        'error',
        { namedComponents: 'arrow-function', unnamedComponents: 'arrow-function' },
      ],
      'react/react-in-jsx-scope': 'off',
    },
  },
  {
    files: [
      'apps/**/*.js',
      'apps/**/*.cjs',
      'apps/**/*.mjs',
      'packages/**/*.js',
      'packages/**/*.cjs',
      'packages/**/*.mjs',
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
      },
    },
  },
  {
    files: ['*.js', '*.cjs', '*.mjs'],
    rules: {
      // Root-level config files (prettier.config.cjs, etc.)
    },
  },
  {
    files: ['packages/engine/src/prng.ts'],
    rules: {
      // PRNG implementation requires parameter reassignment
      'no-param-reassign': 'off',
    },
  },
  {
    files: ['apps/web/next-env.d.ts'],
    rules: {
      // Next.js generates this file with triple-slash references
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },
  {
    files: ['apps/web/src/**/*.worker.ts', 'apps/web/src/**/use-puzzle-worker.ts'],
    rules: {
      'no-undef': 'off', // Worker globals are provided by the runtime
    },
  },
];
