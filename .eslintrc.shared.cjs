/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    '@eslint/js/recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // Reglas generales
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Estilo de código
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    
    // Mejores prácticas
    'eqeqeq': ['error', 'always'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-return-assign': 'error',
    'no-self-compare': 'error',
    'no-throw-literal': 'error',
    'no-unmodified-loop-condition': 'error',
    'no-unused-expressions': 'error',
    'no-useless-call': 'error',
    'no-useless-concat': 'error',
    'no-useless-return': 'error',
    
    // Imports
    'no-duplicate-imports': 'error'
  },
  overrides: [
    // Configuración para TypeScript
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: [
        'eslint:recommended',
        '@typescript-eslint/recommended'
      ],
      rules: {
        // Desactivar reglas de JS que conflictan con TS
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': ['error', { 
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }],
        
        // Reglas específicas de TypeScript
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-non-null-assertion': 'warn',
        '@typescript-eslint/prefer-nullish-coalescing': 'error',
        '@typescript-eslint/prefer-optional-chain': 'error',
        '@typescript-eslint/no-unnecessary-type-assertion': 'error',
        '@typescript-eslint/no-inferrable-types': 'error'
      }
    },
    
    // Configuración para Svelte
    {
      files: ['**/*.svelte'],
      parser: 'svelte-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser'
      },
      plugins: ['svelte', '@typescript-eslint'],
      extends: [
        'eslint:recommended',
        '@typescript-eslint/recommended',
        'plugin:svelte/recommended'
      ],
      rules: {
        // Reglas específicas de Svelte
        'svelte/no-at-debug-tags': 'warn',
        'svelte/no-reactive-functions': 'error',
        'svelte/no-reactive-literals': 'error',
        'svelte/prefer-destructuring-props': 'warn',
        'svelte/require-store-reactive-access': 'error',
        'svelte/valid-compile': 'error',
        
        // Ajustes para Svelte + TypeScript
        '@typescript-eslint/no-unused-vars': ['error', { 
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_|^\\$\\$'
        }]
      }
    },
    
    // Configuración para archivos de test
    {
      files: ['**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js'],
      env: {
        jest: true,
        vitest: true
      },
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-explicit-any': 'off'
      }
    },
    
    // Configuración para archivos de configuración
    {
      files: [
        '*.config.js',
        '*.config.ts',
        '*.config.cjs',
        '*.config.mjs',
        'vite.config.*',
        'vitest.config.*',
        'tailwind.config.*',
        'postcss.config.*'
      ],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-var-requires': 'off'
      }
    }
  ]
};