import { expect, test } from '@playwright/test';

import { best, recordTiming, RUNS } from './record';

test('opening the sheet, and what it downloads', async ({ page }) => {
    await page.goto('/universal_sheet');
    await page.getByRole('button', { name: 'New', exact: true }).click();
    await page
        .getByRole('dialog', { name: 'Create document' })
        .getByRole('button', { name: 'Create', exact: true })
        .click();
    await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toBeVisible();

    // Records when the sheet's first text field appears, from the navigation start (the server
    // HTML holds only the toolbar's file input).
    await page.addInitScript(() => {
        const state = window as unknown as { sheetReady?: number };
        new MutationObserver((_, observer) => {
            if (document.querySelector('#character-sheet-root input:not([type="file"])')) {
                state.sheetReady = performance.now();
                observer.disconnect();
            }
        }).observe(document, { childList: true, subtree: true });
    });

    const runs: number[] = [];
    let bytes = 0;
    for (let run = 0; run <= RUNS; run++) {
        await page.reload({ waitUntil: 'networkidle' });
        const ready = await page.waitForFunction(
            () => (window as unknown as { sheetReady?: number }).sheetReady
        );
        if (run > 0) runs.push((await ready.jsonValue()) as number);
        if (run === 0) {
            // Every script and stylesheet the page loaded, lazy chunks included (SC-004).
            bytes = await page.evaluate(() =>
                performance
                    .getEntriesByType('resource')
                    .map((entry) => entry as PerformanceResourceTiming)
                    .filter(({ name }) => /\.(js|css)(\?|$)/.test(name))
                    .reduce((sum, entry) => sum + entry.encodedBodySize, 0)
            );
        }
    }
    recordTiming({ name: 'open the sheet', value: best(runs), unit: 'ms' });
    recordTiming({ name: 'sheet JS and CSS', value: bytes, unit: 'bytes' });
});
