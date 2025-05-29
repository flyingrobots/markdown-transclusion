const js = require('@eslint/js');
const typescriptParser = require('@typescript-eslint/parser');
const typescriptPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
  // Base configuration
  js.configs.recommended,
  
  // TypeScript files configuration
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json'
      }
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin
    },
    rules: {
      // Turn off base rule in favor of TypeScript rule
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      
      // Allow console.warn and console.error
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      
      // Warn on TODO, FIXME, HACK comments
      'no-warning-comments': ['warn', { 'terms': ['todo', 'fixme', 'hack'], 'location': 'anywhere' }],
      
      // Turn off rules that don't work well with TypeScript
      'no-undef': 'off'
    }
  },
  
  // Global ignores
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', '*.js', '*.config.js']
  }
];