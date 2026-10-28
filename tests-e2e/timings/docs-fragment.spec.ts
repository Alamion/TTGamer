import { expect, test } from '@playwright/test';

import { createDocument } from '../brief';
import { best, recordTiming, RUNS } from './record';

/** How fast a section's "?" shows its rules (spec 045, SC-001): first and later opens. */
test('opening a docs card on a sheet section', async ({ page }) => {
    await createDocument(page, 'star-wars-wod/character');
    // The "?" sits inside the section's header button, which hides it from the accessibility tree.
    const help = page.locator('a[aria-label="Documentation for Attributes"]');
    const card = page.getByRole('dialog', { name: 'Documentation: Attributes' });

    const open = async () => {
        const started = Date.now();
        await help.click();
        await expect(card).toContainText('The nine Attributes define');
        const time = Date.now() - started;
        await page.keyboard.press('Escape');
        await expect(card).toBeHidden();
        return time;
    };

    recordTiming({ name: 'docs card: first open', value: await open(), unit: 'ms', budget: 1000 });
    const later: number[] = [];
    for (let run = 0; run < RUNS; run++) later.push(await open());
    recordTiming({ name: 'docs card: later opens', value: best(later), unit: 'ms', budget: 500 });
});
