import path from 'node:path';

import { expect, test as base } from '@playwright/test';

const FONTS_PATH = '/__e2e-fonts/';

/**
 * The site names no font (`system-ui, sans-serif`), so a page takes the machine's: Noto Sans on
 * Fedora, DejaVu Sans on the CI runner, and pinned heights would differ by a few pixels. Tests draw
 * every page in the fonts of `tests-e2e/fonts` (Noto Sans, subset, OFL) on every machine.
 */
const FONTS_CSS = `
@font-face { font-family: 'E2E Sans'; src: url(${FONTS_PATH}NotoSans.woff2) format('woff2'); font-weight: 100 900; font-style: normal; }
@font-face { font-family: 'E2E Sans'; src: url(${FONTS_PATH}NotoSans-Italic.woff2) format('woff2'); font-weight: 100 900; font-style: italic; }
@font-face { font-family: 'E2E Mono'; src: url(${FONTS_PATH}NotoSansMono.woff2) format('woff2'); font-weight: 100 900; }
* { font-family: 'E2E Sans' !important; }
:where(code, kbd, samp, pre, .font-mono), :where(code, kbd, samp, pre, .font-mono) * { font-family: 'E2E Mono' !important; }
`;

function addFonts(css: string) {
    const add = () => {
        const style = document.createElement('style');
        style.textContent = css;
        (document.head ?? document.documentElement).append(style);
    };
    if (document.documentElement) add();
    else document.addEventListener('readystatechange', add, { once: true });
}

/**
 * Every page fails its test on an uncaught script error, a logged error (React reports a hydration
 * mismatch this way), or a failed request to the site itself (spec 026, FR-004). Third-party
 * requests are not the site's to answer for.
 */
export const test = base.extend<{ siteProblems: string[] }>({
    context: async ({ context }, provide) => {
        await context.route(`**${FONTS_PATH}*`, (route) =>
            route.fulfill({
                path: path.resolve('tests-e2e/fonts', path.basename(route.request().url())),
                contentType: 'font/woff2',
            })
        );
        await context.addInitScript(addFonts, FONTS_CSS);
        await provide(context);
    },
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
