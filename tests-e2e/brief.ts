import type { Page } from '@playwright/test';

/** Creates a document of one kind (a `document-definition` radio value) and leaves it open. */
export async function createDocument(page: Page, definition: string): Promise<void> {
    await page.goto('/universal_sheet');
    await page.getByRole('button', { name: 'New', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Create document' });
    await dialog.locator(`input[value="${definition}"]`).check();
    await dialog.getByRole('button', { name: 'Create', exact: true }).click();
    await page.getByLabel('View mode').first().waitFor();
}

/** Switches the view (`sheet` is the first option, `brief` the one named Brief) and measures it. */
export async function viewHeight(page: Page, view: 'sheet' | 'brief'): Promise<number> {
    const select = page.getByLabel('View mode').first();
    const options = await select.locator('option').allTextContents();
    const label = view === 'sheet' ? options[0] : options.find((name) => /brief/i.test(name));
    if (!label) throw new Error(`No ${view} view among: ${options.join(', ')}`);
    await select.selectOption({ label });
    const root = page.locator('[data-template-root]').first();
    await root.waitFor();
    return Math.round((await root.boundingBox())?.height ?? 0);
}
