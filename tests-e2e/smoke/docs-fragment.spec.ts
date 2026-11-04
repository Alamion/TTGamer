import { createDocument } from '../brief';
import { expect, test } from '../fixtures';

/** The "?" of a sheet section shows its part of the rules in place (spec 045, US1). */

test('a section\'s "?" shows its rules in a card, and Ctrl-click leaves it to the browser', async ({
    page,
}) => {
    await createDocument(page, 'star-wars-wod/character');

    const sheet = page.locator('#character-sheet-root');
    const help = sheet.getByRole('link', { name: 'Documentation for Attributes', exact: true });
    const fold = sheet.getByRole('button', { name: 'Toggle Attributes section', exact: true });
    await help.click();
    await expect(fold).toHaveAttribute('aria-expanded', 'true');
    const card = page.getByRole('dialog', { name: 'Documentation: Attributes' });
    await expect(card).toContainText('Attributes measure raw capabilities');
    // Only the Attributes part: the Abilities section after it stays on the page.
    await expect(card).not.toContainText('The thirty Abilities');
    // Styled: drawn under .tailwind-root.
    await expect(card).toHaveCSS('width', '420px');
    await page.keyboard.press('Escape');
    await expect(card).toBeHidden();

    await fold.click();
    await expect(fold).toHaveAttribute('aria-expanded', 'false');
    await fold.press('Enter');
    await expect(fold).toHaveAttribute('aria-expanded', 'true');

    // Ctrl-click is the browser's (a new tab, checked in the unit test): no card opens.
    await expect(help).toHaveAttribute('target', '_blank');
    await expect(help).toHaveAttribute(
        'href',
        '/docs/star-wars-wod-2e/core-rules/attributes-abilities#attributes'
    );
    await help.click({ modifiers: ['ControlOrMeta'] });
    await expect(card).toBeHidden();
});

test('a user page offers Markdown help and an explicit notes syntax card', async ({ page }) => {
    await page.goto('/universal_sheet');
    await page.getByRole('button', { name: 'Library', exact: true }).click();
    const library = page.getByRole('dialog', { name: 'Library', exact: true });
    await library.getByRole('button', { name: /^Expand Star Wars/ }).click();
    await library
        .getByRole('treeitem')
        .filter({ has: page.getByRole('button', { name: 'Actions for Character', exact: true }) })
        .click();
    await library
        .getByRole('region', { name: 'Character', exact: true })
        .getByRole('button', { name: 'New page', exact: true })
        .click();
    const form = library.getByRole('form', { name: 'New page for Character', exact: true });
    await form.getByLabel('Name', { exact: true }).fill('Markdown help page');
    await form.getByRole('button', { name: 'Create', exact: true }).click();

    const editor = page.getByRole('dialog', { name: 'Markdown help page', exact: true });
    for (const [label, docsPath] of [
        ['Markdown guide', undefined],
        ['Notes syntax', '/docs/guide/notes#syntax'],
    ] as const) {
        await editor
            .getByRole('button', { name: 'Insert an element here', exact: true })
            .last()
            .click();
        await page.getByRole('menuitem', { name: /^Markdown text/ }).click();
        const folded = editor.locator('[data-settings-group] > button[aria-expanded="false"]');
        while ((await folded.count()) > 0) await folded.first().click();
        await editor.getByLabel('Label', { exact: true }).fill(label);
        if (docsPath) await editor.getByLabel(/^Documentation link \(optional\)/).fill(docsPath);
    }
    await editor.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(editor).toBeHidden();
    await library
        .getByRole('button', { name: 'Actions for Markdown help page', exact: true })
        .click();
    await page.getByRole('menuitem', { name: 'Make default', exact: true }).click();
    await page.getByRole('button', { name: 'Close the library', exact: true }).click();

    await createDocument(page, 'star-wars-wod/character', { navigate: false });
    const sheet = page.locator('#character-sheet-root');
    const defaultHelp = sheet.getByRole('link', {
        name: 'Documentation for Markdown guide',
        exact: true,
    });
    await expect(defaultHelp).toHaveAttribute(
        'href',
        '/docs/guide/template-editor/elements#markdown'
    );
    await defaultHelp.click();
    const defaultCard = page.getByRole('dialog', {
        name: 'Documentation: Markdown guide',
        exact: true,
    });
    await expect(defaultCard).toContainText('A long text written in markdown');
    await page.keyboard.press('Escape');
    await expect(defaultCard).toBeHidden();

    const syntaxHelp = sheet.getByRole('link', {
        name: 'Documentation for Notes syntax',
        exact: true,
    });
    await expect(syntaxHelp).toHaveAttribute('href', '/docs/guide/notes#syntax');
    await syntaxHelp.click();
    const syntaxCard = page.getByRole('dialog', {
        name: 'Documentation: Notes syntax',
        exact: true,
    });
    await expect(syntaxCard).toContainText('Notes read the markdown Obsidian writes');
    await expect(syntaxCard).not.toContainText('Creating a note');
});
