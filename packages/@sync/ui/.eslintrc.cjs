/** @type {import('eslint').Linter.Config} */
module.exports = {
  ...require('../../../.eslintrc.shared.cjs'),
  // Configuración específica para @sync/ui
  env: {
    ...require('../../../.eslintrc.shared.cjs').env,
    browser: true,
    node: false
  },
  ignorePatterns: ['node_modules/', 'dist/', 'coverage/', '.svelte-kit/'],
  // Reglas para componentes UI
  rules: {
    ...require('../../../.eslintrc.shared.cjs').rules,
    'no-console': 'warn', // Permitir console en desarrollo de UI
    '@typescript-eslint/no-explicit-any': 'warn',
    // Reglas específicas para Svelte components
    'svelte/no-at-debug-tags': 'error'
  }
};
