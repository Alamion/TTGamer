import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures';

/** Whether a stored document record holds `text` (saving is asynchronous, as on any page). */
function stored(page: Page, text: string): Promise<boolean> {
    return page.evaluate(
        (needle) =>
            new Promise<boolean>((resolve) => {
                const request = indexedDB.open('localforage');
                request.onsuccess = () => {
                    const all = request.result
                        .transaction('keyvaluepairs')
                        .objectStore('keyvaluepairs')
                        .getAll();
                    all.onsuccess = () =>
                        resolve(all.result.some((value) => JSON.stringify(value).includes(needle)));
                    all.onerror = () => resolve(false);
                };
                request.onerror = () => resolve(false);
            }),
        text
    );
}

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
    await page.keyboard.type('# Scene one\nRain at the docks\n- [ ] prepare the map\n\n');
    await page.keyboard.type('> [!spoiler]- The twist\n> The guard is the thief');
    await page.keyboard.press('Escape');

    const heading = page.getByRole('heading', { name: 'Scene one' });
    await expect(heading).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'prepare the map' })).not.toBeChecked();

    await expect.poll(() => stored(page, 'The guard is the thief')).toBe(true);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Scene one' })).toBeVisible();
    await expect(page.getByText('Rain at the docks')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Text' })).toBeHidden();

    // A folded callout starts folded and opens from the keyboard.
    const twist = page.getByRole('button', { name: 'The twist' });
    await expect(twist).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByText('The guard is the thief')).toBeHidden();
    await twist.focus();
    await page.keyboard.press('Enter');
    await expect(twist).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText('The guard is the thief')).toBeVisible();
});
