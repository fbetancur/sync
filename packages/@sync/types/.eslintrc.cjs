/** @type {import('eslint').Linter.Config} */
module.exports = {
  ...require('../../../.eslintrc.shared.cjs'),
  // Configuración específica para @sync/types
  env: {
    ...require('../../../.eslintrc.shared.cjs').env,
    node: true,
    browser: false
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'coverage/'
  ],
  // Reglas muy estrictas para types
  rules: {
    ...require('../../../.eslintrc.shared.cjs').rules,
    'no-console': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    '@typescript-eslint/no-unused-vars': 'error'
  }
};