import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
    },
  },
  // HR-1 Architectural Guard: src/story/** and src/ai/** MUST be pure TypeScript
  {
    files: ['src/story/**/*.{ts,tsx}', 'src/ai/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'HR-1 Violation: src/story and src/ai must not import react.' },
            { name: 'react-dom', message: 'HR-1 Violation: src/story and src/ai must not import react-dom.' },
            { name: 'three', message: 'HR-1 Violation: src/story and src/ai must not import three.' },
            { name: '@react-three/fiber', message: 'HR-1 Violation: src/story and src/ai must not import @react-three/fiber.' },
            { name: '@react-three/drei', message: 'HR-1 Violation: src/story and src/ai must not import @react-three/drei.' },
          ],
          patterns: [
            { group: ['@react-three/*'], message: 'HR-1 Violation: No R3F in pure TS layers.' },
          ]
        }
      ]
    }
  }
);
