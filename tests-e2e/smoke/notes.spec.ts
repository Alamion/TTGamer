import { expect, test } from '../fixtures';

/** A markdown note from creation to reading after a reload (spec 043). */

test('writes a note, reads it, and finds it again after a reload', async ({ page }) => {
    await page.goto('/universal_sheet');
    await page.getByRole('button', { name: 'New', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Create document' });
    await page.keyboard.type('note');
    await page.keyboard.press('Enter');
    await dialog.getByRole('textbox', { name: 'Name' }).fill('Session 12');
    await page.keyboard.press('Enter');
    await expect(dialog).toBeHidden();

    // A new note opens in edit mode with the cursor in its text.
    const text = page.getByRole('textbox', { name: 'Text' });
    await expect(text).toBeFocused();
    await page.keyboard.type('# Scene one\nRain at the docks\n- [ ] prepare the map');
    await page.keyboard.press('Escape');

    const heading = page.getByRole('heading', { name: 'Scene one' });
    await expect(heading).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'prepare the map' })).not.toBeChecked();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Scene one' })).toBeVisible();
    await expect(page.getByText('Rain at the docks')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Text' })).toBeHidden();
});
