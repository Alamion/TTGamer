import type { Page } from '@playwright/test';

/** Opens the shipped Star Wars full sheet in the template editor through the library. */
export async function openFullSheetEditor(page: Page) {
    await page.goto('/universal_sheet');
    await page.getByRole('button', { name: 'Library', exact: true }).click();
    const library = page.getByRole('dialog', { name: 'Library' });
    await library.getByRole('button', { name: /^Expand Star Wars/ }).click();
    await library.getByRole('button', { name: 'Expand Character', exact: true }).click();
    await library.getByRole('button', { name: 'Actions for Full sheet' }).click();
    await page.getByRole('menuitem', { name: 'Open in editor' }).click();
    const editor = page.getByRole('dialog', { name: 'Full sheet' });
    await editor.getByRole('region', { name: 'Outline' }).waitFor();
    return editor;
}

/** The ids of the page's root elements, in outline order. */
export function rootOutlineIds(page: Page) {
    return page
        .locator('[data-children-of="root"] > li > [data-outline-row]')
        .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-outline-row')));
}
