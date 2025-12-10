/** @type {import('eslint').Linter.Config} */
module.exports = {
  ...require('../../.eslintrc.shared.cjs'),
  // Configuración específica para CrediSync
  env: {
    ...require('../../.eslintrc.shared.cjs').env,
    browser: true
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '.svelte-kit/',
    'coverage/'
  ],
  // Reglas específicas para la app
  rules: {
    ...require('../../.eslintrc.shared.cjs').rules,
    // Permitir console.log en desarrollo de apps
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn'
  }
};
