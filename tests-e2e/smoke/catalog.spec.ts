import { expect, test } from '../fixtures';

// Known rows of the shipped Star Wars merits & flaws catalog, so this test also compares the table
// before and after a table library upgrade (spec 026, US4).
test('sorts, filters, and pages a catalog table', async ({ page }) => {
    await page.goto('/docs/star-wars-wod-2e/character/merits-flaws');
    const table = page.getByRole('table').first();
    const firstName = () => table.getByRole('row').nth(1).getByRole('cell').first();

    await expect(firstName()).toHaveText('Higher Purpose');
    await table.getByRole('button', { name: 'Merit / Flaw' }).click();
    await expect(firstName()).toHaveText('Absent-Minded');
    await table.getByRole('button', { name: 'Merit / Flaw' }).click();
    await expect(firstName()).toHaveText('Wrist Dart Launcher');

    await page.getByRole('button', { name: 'Next page' }).first().click();
    await expect(firstName()).toHaveText('Strong in the Force');

    await page.getByRole('textbox', { name: 'Search merits & flaws...' }).fill('ambidex');
    await expect(table.getByRole('row')).toHaveCount(2);
    await expect(firstName()).toHaveText('Ambidextrous');
});
