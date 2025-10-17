/* Shared ESLint config for Sovereign monorepo */
module.exports = {
  root: false,
  env: { es2022: true, node: true, browser: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'jsx-a11y'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'prettier',
  ],
  settings: { react: { version: 'detect' } },
  rules: {
    // Style and language
    quotes: ['error', 'single', { avoidEscape: true }],
    'comma-dangle': ['error', 'always-multiline'],
    'no-var': 'error',
    'prefer-const': 'error',
    'object-shorthand': ['error', 'always'],

    // Functional style preferences
    'prefer-arrow-callback': 'error',
    'func-style': ['error', 'expression', { allowArrowFunctions: true }],
    'no-param-reassign': ['error', { props: true }],
    'no-restricted-syntax': [
      'error',
      { selector: 'ClassDeclaration', message: 'Avoid classes; prefer functions and hooks.' },
      { selector: 'ClassExpression', message: 'Avoid classes; prefer functions and hooks.' },
    ],

    // TS
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/explicit-function-return-type': 'off',

    // React
    'react/function-component-definition': [
      'error',
      { namedComponents: 'arrow-function', unnamedComponents: 'arrow-function' },
    ],
    'react/react-in-jsx-scope': 'off',
  },
  overrides: [
    {
      files: ['*.js', '*.cjs'],
      parser: 'espree',
      rules: {},
    },
  ],
};
