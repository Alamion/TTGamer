import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
// `yarn ci:docker` tests the site image instead of build/ (T-118).
const IMAGE = process.env.E2E_IMAGE;

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
        // Only for `yarn readme:screenshots`: it rewrites the README images (T-119).
        ...(process.env.README_SHOTS
            ? [
                  {
                      name: 'readme',
                      testDir: 'tests-e2e/readme',
                      use: { colorScheme: 'dark' as const },
                  },
              ]
            : []),
    ],
    webServer: {
        command: IMAGE
            ? `docker run --rm --init -p ${PORT}:8080 ${IMAGE}`
            : `node --import tsx tests-e2e/require-build.ts && docusaurus serve --port ${PORT} --no-open`,
        // The default kill stops the docker client but leaves the container running.
        gracefulShutdown: IMAGE ? { signal: 'SIGTERM', timeout: 10_000 } : undefined,
        url: `http://localhost:${PORT}`,
        // Port 3000 is the maintainer's dev server; this one is always our own.
        reuseExistingServer: false,
        timeout: 60_000,
    },
});
