import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
    globalIgnores(['dist', 'build', '.docusaurus', 'coverage', 'tmp', 'context', '.claude']),
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
            // Custom inputs that render a native <input> a wrapping <label> names.
            'jsx-a11y/label-has-associated-control': [
                'error',
                { controlComponents: ['NumberInput'], depth: 3 },
            ],
            'simple-import-sort/exports': 'error',
            'simple-import-sort/imports': 'error',
        },
    },
    {
        // System boundary: generic sheet code reaches systems only through the registry and the
        // neutral `systems/*.ts` contracts, never a concrete system folder (any system, current or
        // future). Concrete systems, the registry wiring, docs embeds, and the legacy character
        // import path are the only allowed importers.
        files: ['src/sheet_manager/**/*.{ts,tsx}'],
        ignores: [
            'src/sheet_manager/systems/*/**',
            'src/sheet_manager/systems/index.ts',
            'src/sheet_manager/docsEmbeds.tsx',
            'src/sheet_manager/store/documentStore.ts',
        ],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            caseSensitive: true,
                            regex: '(^|/)systems/(?!(?:wod-like|index|registry|types|view|capabilities|catalogs|policies)(?:/|$))[a-z0-9-]+(?:/|$)',
                            message:
                                'Generic sheet code must not import a concrete system; declare the need on SystemPlugin (templateBindings, catalogs, policies) instead.',
                        },
                    ],
                },
            ],
        },
    },
    {
        // Neutral WoD-family helpers must not depend on a concrete system either.
        files: ['src/sheet_manager/systems/wod-like/**/*.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            caseSensitive: true,
                            regex: '^\\.\\./(?!(?:index|registry|types|view|capabilities|catalogs|policies|templateBindings)(?:/|$))[a-z0-9-]+(?:/|$)',
                            message: 'WoD-family helpers must not import a concrete system.',
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
    // Last, so Prettier owns formatting even if a preset or rule above enables a stylistic rule.
    prettierConfig,
]);
