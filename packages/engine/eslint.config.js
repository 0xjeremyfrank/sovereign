import { baseConfig } from '../config/eslint.config.base.js';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: {
      // Engine-specific overrides can go here
    },
  },
  {
    files: ['src/prng.ts'],
    rules: {
      // PRNG implementation requires parameter reassignment
      'no-param-reassign': 'off',
    },
  },
];
