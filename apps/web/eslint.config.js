import { baseConfig } from '../../packages/config/eslint.config.base.js';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      globals: {
        MouseEvent: 'readonly',
        TouchEvent: 'readonly',
      },
    },
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
  {
    files: ['src/**/*.worker.ts', 'src/**/use-puzzle-worker.ts'],
    rules: {
      'no-undef': 'off', // Worker globals are provided by the runtime
    },
  },
];
