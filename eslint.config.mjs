import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
    globalIgnores(['dist', 'build', '.docusaurus', 'coverage', 'tmp']),
    {
        files: ['**/*.{ts,tsx}'],
        extends: [
            js.configs.recommended,
            tseslint.configs.recommended,
            reactHooks.configs.flat.recommended,
        ],
        languageOptions: {
            globals: globals.browser,
        },
        plugins: {
            'jsx-a11y': jsxA11y,
            'simple-import-sort': simpleImportSort,
        },
        rules: {
            ...jsxA11y.flatConfigs.recommended.rules,
            'simple-import-sort/exports': 'error',
            'simple-import-sort/imports': 'error',
        },
    },
    {
        files: ['scripts/**/*.ts', '*.config.{js,mjs,ts}', 'sidebars.ts'],
        languageOptions: {
            globals: globals.node,
        },
    },
]);
