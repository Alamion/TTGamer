import { expect, test } from '../fixtures';
import { tool } from '../tools';

test('rolls dice from the keyboard', async ({ page }) => {
    await page.goto('/universal_sheet');
    await page.getByRole('button', { name: 'Toggle dice roller' }).focus();
    await page.keyboard.press('Enter');

    // On the sheet page the panel is a tool of the layout; with no document yet it floats.
    const panel = tool(page, 'Dice Roller');
    const notation = panel.getByRole('textbox', { name: /^Roll notation/ });
    await notation.focus();
    await page.keyboard.type('2d6');
    await page.keyboard.press('Enter');

    // The 3D dice settle before the result is written to the history.
    await expect(panel.getByRole('button', { name: /^2d6 = \d+$/ })).toBeVisible({
        timeout: 15_000,
    });
});

test('slides in on a documentation page, where no layout claims it (spec 036, FR-014)', async ({
    page,
}) => {
    await page.goto('/docs/documents');
    await page.getByRole('button', { name: 'Toggle dice roller' }).click();
    await expect(page.getByRole('complementary', { name: 'Dice Roller' })).toBeVisible();
    await expect(page.locator('[data-group-frame]')).toHaveCount(0);
});
