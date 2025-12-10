/** @type {import('eslint').Linter.Config} */
module.exports = {
  ...require('../../../.eslintrc.shared.cjs'),
  // Configuración específica para @sync/core
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
  // Reglas más estrictas para packages
  rules: {
    ...require('../../../.eslintrc.shared.cjs').rules,
    'no-console': 'error', // No console.log en packages
    '@typescript-eslint/no-explicit-any': 'error', // Más estricto con any
    '@typescript-eslint/explicit-function-return-type': 'warn'
  }
};