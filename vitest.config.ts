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
        setupFiles: ['tests/setup/sheetIssues.ts'],
        // Worker threads start faster than forked processes: about 15% off the default run.
        pool: 'threads',
        // Timing tests run alone, one file at a time; the default run has no wall-clock budgets
        // (spec 024).
        projects: [
            {
                extends: true,
                test: {
                    name: 'unit',
                    include: ['tests/**/*.test.{ts,tsx}'],
                    exclude: ['tests/**/*.perf.test.{ts,tsx}'],
                },
            },
            {
                extends: true,
                test: {
                    name: 'perf',
                    include: ['tests/**/*.perf.test.{ts,tsx}'],
                    fileParallelism: false,
                    // A separate process per file keeps timings free of the other files' garbage.
                    pool: 'forks',
                },
            },
        ],
    },
});
