import { createDocument } from '../brief';
import { expect, test } from '../fixtures';

test('the Russian term-help replay stays reachable on a phone after dismissal', async ({
    page,
}) => {
    await createDocument(page, 'star-wars-wod/character');
    await page.goto('/ru/universal_sheet');

    for (const width of [320, 375]) {
        await page.setViewportSize({ width, height: 844 });
        await page.getByRole('button', { name: 'Понятно', exact: true }).click();
        await expect(page.getByRole('note')).toBeHidden();

        const replay = page.getByRole('button', {
            name: 'Показать подсказку снова',
            exact: true,
        });
        const mode = page.getByRole('combobox', { name: 'Игровые термины', exact: true });
        for (const control of [mode, replay]) {
            await expect(control).toBeVisible();
            const box = await control.boundingBox();
            if (!box) throw new Error('The help control has no visible box');
            expect(box.x).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
        }
        expect(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
            )
        ).toBe(true);

        await replay.focus();
        await replay.press('Enter');
        await expect(page.getByRole('note')).toBeVisible();
    }
});
