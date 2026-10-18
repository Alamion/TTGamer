import { expect, test } from '../fixtures';

/** Browser Back and Forward return between linked documents on the one sheet page (T-057). */

test('Back and Forward follow the links between documents', async ({ page }) => {
    await page.goto('/universal_sheet');
    await page.getByRole('button', { name: 'New', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Create document' });
    const folded = dialog.locator('button[aria-expanded="false"]');
    while ((await folded.count()) > 0) await folded.first().click();
    await dialog.locator('[data-kind="wod-v5/v5-group"]').click();
    await dialog.getByLabel('The Lantern Choir (example)').check();
    await dialog.getByRole('button', { name: 'Create', exact: true }).click();

    const name = page.getByRole('textbox', { name: 'Name', exact: true }).first();
    await expect(name).toHaveValue('The Lantern Choir');
    await page.getByRole('button', { name: 'Open The thing in the pines' }).click();
    await expect(name).toHaveValue('The thing in the pines');

    await page.goBack();
    await expect(name).toHaveValue('The Lantern Choir');
    await expect(page).toHaveURL(/\/universal_sheet\?doc=/);
    await page.goForward();
    await expect(name).toHaveValue('The thing in the pines');
});
