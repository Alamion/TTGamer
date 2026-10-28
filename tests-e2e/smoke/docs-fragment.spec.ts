import { createDocument } from '../brief';
import { expect, test } from '../fixtures';

/** The "?" of a sheet section shows its part of the rules in place (spec 045, US1). */

test('a section\'s "?" shows its rules in a card, and Ctrl-click leaves it to the browser', async ({
    page,
}) => {
    await createDocument(page, 'star-wars-wod/character');

    // The "?" sits inside the section's header button, which hides it from the accessibility tree.
    const help = page.locator('a[aria-label="Documentation for Attributes"]');
    await help.click();
    const card = page.getByRole('dialog', { name: 'Documentation: Attributes' });
    await expect(card).toContainText('The nine Attributes define');
    // Only the Attributes part: the Abilities section after it stays on the page.
    await expect(card).not.toContainText('The thirty Abilities');
    // Styled: drawn under .tailwind-root.
    await expect(card).toHaveCSS('width', '420px');
    await page.keyboard.press('Escape');
    await expect(card).toBeHidden();

    // Ctrl-click is the browser's (a new tab, checked in the unit test): no card opens.
    await expect(help).toHaveAttribute('target', '_blank');
    await expect(help).toHaveAttribute(
        'href',
        '/docs/star-wars-wod-2e/core-rules/attributes-abilities#attributes'
    );
    await help.click({ modifiers: ['ControlOrMeta'] });
    await expect(card).toBeHidden();
});
