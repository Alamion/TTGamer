import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
    globalIgnores(['dist', 'build', '.docusaurus', 'coverage', 'tmp', 'context']),
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
        // System boundary: generic template code reaches systems only through
        // `systems/templateBindings` and the registry, never a concrete system module.
        files: [
            'src/sheet_manager/features/sheet/declarative/**/*.{ts,tsx}',
            'src/sheet_manager/components/dialogs/template-editor/**/*.{ts,tsx}',
            'src/sheet_manager/systems/templateBindings.ts',
            'src/sheet_manager/systems/view.ts',
            'src/sheet_manager/systems/wod-like/**/*.ts',
            'src/sheet_manager/types/**/*.ts',
            'src/sheet_manager/hooks/**/*.ts',
        ],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['**/systems/star-wars-wod', '**/systems/star-wars-wod/**'],
                            message:
                                'Generic sheet code must not import a concrete system; declare the need on SystemPlugin (e.g. templateBindings) instead.',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['scripts/**/*.ts', '*.config.{js,mjs,ts}', 'sidebars.ts'],
        languageOptions: {
            globals: globals.node,
        },
    },
]);
