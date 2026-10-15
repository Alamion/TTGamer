import type { Page } from '@playwright/test';

/**
 * A tool of the sheet page (spec 036) by its name: a region of the layout when it is a group's tab,
 * a dialog when it floats or fills a phone's screen.
 */
export const tool = (page: Page, name: string) =>
    page
        .getByRole('region', { name, exact: true })
        .or(page.getByRole('dialog', { name, exact: true }));

/** The documents tool, wherever it is held. */
export const documentsTool = (page: Page) => tool(page, 'Documents');

/** Closes the documents tool: its tab's close button, or its window's. */
export const closeDocumentsTool = (page: Page) =>
    page
        .getByRole('button', { name: /^Close (Documents|the documents window)$/ })
        .first()
        .click();

/**
 * Opens the documents tool floating above the page, so it takes no group of the layout: from the
 * toolbar, then its tab's menu (spec 036). On a phone it already fills the screen.
 */
export async function openDocumentsFloating(page: Page) {
    await page.getByRole('button', { name: 'Manage', exact: true }).click();
    if (page.viewportSize()!.width >= 768) {
        const tab = page.locator('[data-group-strip]').getByRole('tab', {
            name: 'Documents',
            exact: true,
        });
        if (await tab.count()) {
            await tab.focus();
            await page.keyboard.press('Shift+F10');
            await page.getByRole('menuitem', { name: 'Float' }).click();
        }
    }
    return page.getByRole('dialog', { name: 'Documents', exact: true });
}
