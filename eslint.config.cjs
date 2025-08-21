// Flat ESLint configuration for ESLint v9+ (migrated from .eslintrc.cjs)
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');

const tsRecommended = (tsPlugin && tsPlugin.configs && tsPlugin.configs.recommended && tsPlugin.configs.recommended.rules) || {};

module.exports = [
  // ignore patterns (replace .eslintignore)
  {
    ignores: ['node_modules/', 'dist/', 'generated/', 'coverage/', '.vscode/', '.env', 'eslint.config.cjs', '.eslintrc.cjs'],
  },

  // Apply rules for TypeScript and JS files
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module'
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: Object.assign({}, tsRecommended, {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-module-boundary-types': 'off'
    })
  }
];
