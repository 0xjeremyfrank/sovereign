import { baseConfig } from './packages/config/eslint.config.base.js';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  ...baseConfig,
  {
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
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
];
