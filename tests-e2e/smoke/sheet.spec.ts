import { expect, test } from '../fixtures';

test('a new character keeps its name after a reload', async ({ page }) => {
    await page.goto('/universal_sheet');
    await page.getByRole('button', { name: 'New', exact: true }).click();
    const create = page.getByRole('dialog', { name: 'Create document' });
    await create.getByRole('button', { name: 'Create', exact: true }).click();

    const name = page.getByRole('textbox', { name: 'Name', exact: true });
    await name.fill('Kyla Venn');
    await name.blur();

    // The store writes to IndexedDB asynchronously: reload until the saved value is there.
    await expect(async () => {
        await page.reload();
        await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue(
            'Kyla Venn',
            { timeout: 2_000 }
        );
    }).toPass({ timeout: 15_000 });
});
