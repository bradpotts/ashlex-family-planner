import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: new URL('.', import.meta.url).pathname
      }
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' }
      ],
      'no-console': 'off'
    }
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: { globals: globals.browser }
  },
  {
    files: ['server/**/*.ts', 'tests/**/*.ts', '*.config.ts'],
    languageOptions: { globals: globals.node }
  },
  {
    ignores: ['dist/**', 'node_modules/**']
  }
)
