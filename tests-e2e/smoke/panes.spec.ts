import { createDocument, measureView, showView } from '../brief';
import { expect, test } from '../fixtures';
import { SINGLE_DOCUMENT_BASELINE } from './panes-baseline';

test('with one document the page keeps its height (spec 034, SC-005)', async ({ page }) => {
    await createDocument(page, 'star-wars-wod/character');
    for (const view of ['sheet', 'brief'] as const) {
        await showView(page, view);
        for (const width of [375, 1280] as const) {
            await page.setViewportSize({ width, height: 800 });
            const { height } = await measureView(page);
            const expected = SINGLE_DOCUMENT_BASELINE[view][width];
            expect(Math.abs(height - expected) / expected, `${view} at ${width} px`).toBeLessThan(
                0.01
            );
        }
    }
    await expect(page.getByRole('tablist')).toHaveCount(0);
});
