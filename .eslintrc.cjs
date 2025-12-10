/** @type {import('eslint').Linter.Config} */
module.exports = {
  ...require('./.eslintrc.shared.cjs'),
  // Configuración específica del root
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '.vercel/',
    'coverage/',
    '*.min.js',
    '*.cjs'
  ]
};
