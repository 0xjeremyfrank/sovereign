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
];
