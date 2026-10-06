import type { Page } from '@playwright/test';

import { openFullSheetEditor, rootOutlineIds } from '../editor';
import { expect, test } from '../fixtures';

/** The root elements in the order the page draws them. */
function rootPageIds(page: Page, rootIds: readonly (string | null)[]) {
    return page
        .locator('[data-editor-frame][data-node-id]')
        .evaluateAll(
            (frames, ids) =>
                frames
                    .map((frame) => frame.getAttribute('data-node-id'))
                    .filter((id) => ids.includes(id)),
            rootIds
        );
}

test('moves an element with the keyboard and undoes it', async ({ page }) => {
    await openFullSheetEditor(page);
    const before = await rootOutlineIds(page);
    const [first, second] = before;
    expect(await rootPageIds(page, before)).toEqual(before);

    await page
        .locator(`[data-outline-row="${first}"] button:not([data-drag-handle])`)
        .first()
        .click();
    await page.keyboard.press('Alt+ArrowDown');

    const moved = [second, first, ...before.slice(2)];
    await expect.poll(() => rootOutlineIds(page)).toEqual(moved);
    await expect.poll(() => rootPageIds(page, before)).toEqual(moved);

    await page.keyboard.press('Control+z');
    await expect.poll(() => rootOutlineIds(page)).toEqual(before);
    await expect.poll(() => rootPageIds(page, before)).toEqual(before);
});
