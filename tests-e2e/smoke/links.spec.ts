import { readFileSync } from 'node:fs';

import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures';

/** Links between documents from writing to export (spec 044). */

async function createNote(page: Page, name: string) {
    await page.getByRole('button', { name: 'New', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Create document' });
    await page.keyboard.type('note');
    await page.keyboard.press('Enter');
    await dialog.getByRole('textbox', { name: 'Name' }).fill(name);
    await page.keyboard.press('Enter');
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('textbox', { name: 'Text' })).toBeFocused();
}

test('writes a link with suggestions, previews and follows it, and keeps it on a rename', async ({
    page,
}) => {
    await page.goto('/universal_sheet');
    await createNote(page, 'Ines Ruiz');
    await page.keyboard.type('Fixer at the docks.');
    await page.keyboard.press('Escape');

    await createNote(page, 'Session');
    await page.keyboard.type('Meet [[Ine');
    const option = page.getByRole('option', { name: /Ines Ruiz/ });
    await expect(option).toBeVisible();
    await page.keyboard.press('Enter');
    await page.keyboard.type(' tonight.');
    await expect(page.getByRole('textbox', { name: 'Text' })).toHaveValue(
        'Meet [[Ines Ruiz]] tonight.'
    );
    await page.keyboard.press('Escape');

    // The card shows the note's first lines without leaving the page.
    const link = page.getByRole('link', { name: 'Ines Ruiz' });
    await link.hover();
    const card = page.getByRole('dialog', { name: 'Preview of Ines Ruiz' });
    await expect(card).toContainText('Fixer at the docks.');
    // Styled: drawn under .tailwind-root, not unstyled in the page body.
    await expect(card).toHaveCSS('width', '360px');
    await page.mouse.move(0, 0);
    await expect(card).toBeHidden();

    // Following it keeps the way back; the target lists where it is mentioned.
    await link.click();
    const name = page.getByRole('textbox', { name: 'Name' });
    await expect(name).toHaveValue('Ines Ruiz');
    const mentions = page.getByRole('list', { name: 'Mentioned in' });
    await expect(mentions).toContainText('Session', { timeout: 10_000 });
    await expect(mentions).toContainText('Meet [[Ines Ruiz]] tonight.');

    // A new name is taken once the field is left, and the link in the other note follows it.
    await name.fill('Ines Ruiz-Vega');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('status').filter({ hasText: 'Links kept' })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('link', { name: 'Ines Ruiz-Vega' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('link', { name: 'Ines Ruiz-Vega' })).toBeVisible();

    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export' }).click();
    const markdown = readFileSync(await (await downloading).path(), 'utf8');
    expect(markdown).toContain('Meet [[Ines Ruiz-Vega]] tonight.');
});
