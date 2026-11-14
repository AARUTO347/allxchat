import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-useless-escape': 'off',
      'no-control-regex': 'off',
      'no-constant-binary-expression': 'warn',
      'prefer-const': 'error',
      'preserve-caught-error': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'whatsapp-bridge/**',
      'vercel-stage/**',
      'AARUTO_ANIME.AI/**',
      'AUTAI_ZEN_AOD_2.0/**',
      'animdustry-play/**',
      'animdustry/**',
      'AARUESP/**',
      'AARUTO_ANIME.AI/**',
    ],
  },
);
