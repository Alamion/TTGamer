import type { Page } from '@playwright/test';

/** Creates a document of one kind (its `data-kind` in the create dialog) and leaves it open. */
export async function createDocument(page: Page, definition: string): Promise<void> {
    await page.goto('/universal_sheet');
    await page.getByRole('button', { name: 'New', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Create document' });
    await dialog.locator(`[data-kind="${definition}"]`).click();
    await dialog.getByRole('button', { name: 'Create', exact: true }).click();
    await page.getByLabel('View mode').first().waitFor();
}

export interface ViewSize {
    /** The sheet root's height, its own padding included. */
    height: number;
    /** The height without the root's padding (which the page, not the brief, decides). */
    content: number;
    /** Something sticks out of the window sideways. */
    overflows: boolean;
}

/** Switches the view (`sheet` is the first option, `brief` the one named Brief). */
export async function showView(page: Page, view: 'sheet' | 'brief'): Promise<void> {
    const select = page.getByLabel('View mode').first();
    const options = await select.locator('option').allTextContents();
    const label = view === 'sheet' ? options[0] : options.find((name) => /brief/i.test(name));
    if (!label) throw new Error(`No ${view} view among: ${options.join(', ')}`);
    await select.selectOption({ label });
    await page.locator('[data-template-root]').first().waitFor();
}

/** Measures the open view at the current window size; `areaWidth` narrows only the sheet root. */
export async function measureView(page: Page, areaWidth?: number): Promise<ViewSize> {
    return page.evaluate((width) => {
        const root = document.querySelector<HTMLElement>('[data-template-root]')!;
        root.style.maxWidth = width ? `${width}px` : '';
        root.style.marginInline = width ? '0' : '';
        const box = root.getBoundingClientRect();
        const style = getComputedStyle(root);
        const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
        const limit = document.documentElement.clientWidth + 0.5;
        const overflows =
            document.documentElement.scrollWidth > document.documentElement.clientWidth ||
            [...root.querySelectorAll('*')].some(
                (node) => node.getBoundingClientRect().right > limit
            );
        return {
            height: Math.round(box.height),
            content: Math.round(box.height - padding),
            overflows,
        };
    }, areaWidth);
}
