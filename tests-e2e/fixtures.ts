import { expect, test as base } from '@playwright/test';

/**
 * Every page fails its test on an uncaught script error, a logged error (React reports a hydration
 * mismatch this way), or a failed request to the site itself (spec 026, FR-004). Third-party
 * requests are not the site's to answer for.
 */
export const test = base.extend<{ siteProblems: string[] }>({
    siteProblems: [
        async ({ page, baseURL }, use) => {
            const problems: string[] = [];
            const ownRequest = (url: string) => !!baseURL && url.startsWith(baseURL);
            page.on('pageerror', (error) => problems.push(`script error: ${error.message}`));
            page.on('console', (message) => {
                if (message.type() === 'error') problems.push(`logged error: ${message.text()}`);
            });
            page.on('requestfailed', (request) => {
                if (ownRequest(request.url())) {
                    problems.push(
                        `request failed: ${request.url()} (${request.failure()?.errorText})`
                    );
                }
            });
            page.on('response', (response) => {
                if (ownRequest(response.url()) && response.status() >= 400) {
                    problems.push(`HTTP ${response.status()}: ${response.url()}`);
                }
            });
            await use(problems);
            expect(
                problems,
                'the page ran without script errors, logged errors, or failed requests'
            ).toEqual([]);
        },
        { auto: true },
    ],
});

export { expect };
