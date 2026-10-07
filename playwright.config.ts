import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;

export default defineConfig({
    testDir: 'tests-e2e',
    // A retry would hide a flaky test; AGENTS.md §11 says fix or quarantine it.
    retries: 0,
    forbidOnly: !!process.env.CI,
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL: `http://localhost:${PORT}`,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        { name: 'smoke', testDir: 'tests-e2e/smoke', use: { ...devices['Desktop Chrome'] } },
        // Reported against their budgets, never asserted (spec 026, D7).
        { name: 'timings', testDir: 'tests-e2e/timings', use: { ...devices['Desktop Chrome'] } },
    ],
    webServer: {
        command: `node --import tsx tests-e2e/require-build.ts && docusaurus serve --port ${PORT} --no-open`,
        url: `http://localhost:${PORT}`,
        // Port 3000 is the maintainer's dev server; this one is always our own.
        reuseExistingServer: false,
        timeout: 60_000,
    },
});
