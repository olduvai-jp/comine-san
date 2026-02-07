import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },

  {
    files: ['**/*.{js,mjs,cjs}'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: { ...globals.es2021, ...globals.node },
    },
  },

  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.ts'],
  })),

  // Prefer Prettier for formatting concerns.
  {
    files: ['**/*.{ts,js,mjs,cjs}'],
    ...eslintConfigPrettier,
  },

  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: { ...globals.es2021, ...globals.node },
    },
    rules: {
      // TypeScript handles this (and NodeNext TS files may legally use `require` in CJS output).
      'no-undef': 'off',

      // Keep initial adoption low-friction for this codebase.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
];
