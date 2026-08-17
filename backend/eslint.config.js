import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json'
      }
    },
    rules: {
      '@typescript-eslint/no-misused-promises': 'off'
    }
  },
  {
    ignores: ['dist/**', 'node_modules/**']
  }
);
