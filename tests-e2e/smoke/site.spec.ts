import { expect, test } from '../fixtures';

const PAGES = [
    { path: '/', heading: /TTGamer/ },
    { path: '/docs/star-wars-wod-2e/core-rules/attributes-abilities', heading: /Attributes/ },
    { path: '/ru/docs/star-wars-wod-2e/core-rules/attributes-abilities', heading: /Атрибуты/ },
];

for (const { path, heading } of PAGES) {
    test(`${path} loads with its styles`, async ({ page }) => {
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 }).first()).toHaveText(heading);
        // A stylesheet that failed to load has no rules (a 404 also fails the fixture).
        const styled = await page.evaluate(() =>
            [...document.styleSheets].every((sheet) => sheet.cssRules.length > 0)
        );
        expect(styled).toBe(true);
        await expect(page.locator('nav.navbar')).toBeVisible();
    });
}
