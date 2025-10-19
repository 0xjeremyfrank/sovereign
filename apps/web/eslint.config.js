import { baseConfig } from '../../packages/config/eslint.config.base.js';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Web app specific overrides
    },
  },
  {
    files: ['next-env.d.ts'],
    rules: {
      // Next.js generates this file with triple-slash references
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },
];
