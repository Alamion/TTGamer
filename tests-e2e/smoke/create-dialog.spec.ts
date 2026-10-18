import { expect, test } from '../fixtures';

/** The create dialog on a phone, by keyboard alone (spec 039, US4, SC-004). */

test.use({ viewport: { width: 360, height: 740 } });

test('creates a named vampire from Mirela at 360 px with the keyboard', async ({ page }) => {
    await page.goto('/universal_sheet');
    await page.getByRole('button', { name: 'New', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Create document' });
    const search = dialog.getByRole('combobox', { name: 'Search kinds' });
    await expect(search).toBeFocused();

    // The dialog fills the screen, nothing sticks out sideways, and rows are touch-sized.
    const box = await dialog.boundingBox();
    expect(box).toMatchObject({ x: 0, y: 0, width: 360, height: 740 });
    const layout = await page.evaluate(() => ({
        overflows:
            document.documentElement.scrollWidth > document.documentElement.clientWidth ||
            [...document.querySelectorAll('[role="dialog"] *')].some(
                (element) => element.getBoundingClientRect().right > window.innerWidth + 0.5
            ),
        shortRows: [...document.querySelectorAll('[role="option"], [role="dialog"] button')]
            .map((element) => element.getBoundingClientRect().height)
            .filter((height) => height > 0 && height < 32),
    }));
    expect(layout).toEqual({ overflows: false, shortRows: [] });

    await page.keyboard.type('vam');
    await page.keyboard.press('Enter');
    const name = dialog.getByRole('textbox', { name: 'Name' });
    await expect(name).toBeFocused();
    await expect(search).toBeHidden();

    // Back to the start choice, then to the example.
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('radio', { name: 'Blank' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(dialog.getByRole('radio', { name: 'Mirela Voss (example)' })).toBeChecked();
    await page.keyboard.press('Tab');
    await expect(name).toBeFocused();
    await page.keyboard.type('Mira');
    await page.keyboard.press('Enter');

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Mira');
    const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflows).toBe(false);
});
