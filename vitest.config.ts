import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@site': path.resolve(__dirname),
            '@docusaurus/Translate': path.resolve(__dirname, 'tests/stubs/docusaurus.ts'),
            '@docusaurus/router': path.resolve(__dirname, 'tests/stubs/docusaurusRouter.ts'),
            '@docusaurus/useDocusaurusContext': path.resolve(
                __dirname,
                'tests/stubs/docusaurusContext.ts'
            ),
        },
    },
    test: {
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
        },
        include: ['tests/**/*.test.{ts,tsx}'],
        setupFiles: ['tests/setup/sheetIssues.ts'],
    },
});
