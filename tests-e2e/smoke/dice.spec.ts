import { expect, test } from '../fixtures';

test('rolls dice from the keyboard', async ({ page }) => {
    await page.goto('/universal_sheet');
    await page.getByRole('button', { name: 'Toggle dice roller' }).focus();
    await page.keyboard.press('Enter');

    const panel = page.getByRole('complementary', { name: 'Dice Roller' });
    const notation = panel.getByRole('textbox', { name: /^Roll notation/ });
    await notation.focus();
    await page.keyboard.type('2d6');
    await page.keyboard.press('Enter');

    // The 3D dice settle before the result is written to the history.
    await expect(panel.getByRole('button', { name: /^2d6 = \d+$/ })).toBeVisible({
        timeout: 15_000,
    });
});
