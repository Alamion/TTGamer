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
    const heading = card.getByRole('heading', { name: 'Attributes', exact: true }).first();
    await expect(heading).toHaveCSS('font-size', '18px');
    await expect(heading).toHaveCSS('font-weight', '700');
    await expect(card.getByRole('heading', { name: 'Physical', exact: true }).first()).toHaveCSS(
        'font-size',
        '16px'
    );
    await expect(heading).toHaveCSS('margin-top', '0px');
    await expect(heading).toHaveCSS('margin-bottom', '8px');
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

test('Russian dark sheet keeps rules help and omits automatic portrait help', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await createDocument(page, 'wod-2e/wod2e-character');
    await page.goto('/ru/universal_sheet');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const sheet = page.locator('#character-sheet-root');
    for (const label of ['Натура', 'Инициатива (обыч.)', 'Воля']) {
        const link = sheet.getByRole('link', { name: `Документация: ${label}`, exact: true });
        await expect(link.locator('..')).toHaveCSS('margin-inline-start', '6px');
    }

    await sheet.getByRole('button', { name: 'Свернуть или развернуть раздел «Внешность»' }).click();
    await sheet.getByRole('checkbox', { name: 'Показывать портрет', exact: true }).check();
    await expect(sheet.getByLabel('Загрузить изображение', { exact: true })).toBeVisible();
    await expect(
        sheet.getByRole('link', { name: 'Документация: Портрет', exact: true })
    ).toHaveCount(0);

    await sheet.getByRole('link', { name: 'Документация: Добродетели', exact: true }).click();
    const virtues = page.getByRole('dialog').getByRole('heading', {
        name: 'Добродетели',
        exact: true,
    });
    await expect(virtues).toHaveCSS('font-size', '18px');
    await expect(virtues).toHaveCSS('font-weight', '700');
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
        ['Editing keys', '/docs/guide/notes#editing'],
        ['Rating guide', '/docs/guide/template-editor/elements#rating'],
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
    await page.keyboard.press('Escape');

    await sheet.getByRole('link', { name: 'Documentation for Editing keys', exact: true }).click();
    const editingCard = page.getByRole('dialog', { name: 'Documentation: Editing keys' });
    await expect(editingCard.getByRole('columnheader', { name: 'Keys', exact: true })).toHaveCSS(
        'border-bottom-width',
        '1px'
    );
    const code = editingCard.locator('td code').first();
    await expect(code).toBeVisible();
    expect(await code.evaluate((node) => getComputedStyle(node).backgroundColor)).not.toBe(
        'rgba(0, 0, 0, 0)'
    );
    await page.keyboard.press('Escape');

    await sheet.getByRole('link', { name: 'Documentation for Rating guide', exact: true }).click();
    const ratingCard = page.getByRole('dialog', { name: 'Documentation: Rating guide' });
    await expect(ratingCard.locator('.markdown > ul').first()).toHaveCSS('list-style-type', 'disc');
    const limitsLink = ratingCard.getByRole('link', { name: 'maximum from a value or formula' });
    await expect(limitsLink).toHaveAttribute('target', '_blank');
    const colors = await limitsLink.evaluate((node) => ({
        link: getComputedStyle(node).color,
        body: getComputedStyle(node.parentElement!).color,
    }));
    expect(colors.link).not.toBe(colors.body);
});

for (const locale of ['en', 'ru'] as const) {
    test(`${locale}: skill help stays with the last word in normal and dense rows`, async ({
        page,
    }) => {
        await createDocument(page, 'wod-2e/wod2e-character');
        if (locale === 'ru') await page.goto('/ru/universal_sheet');
        const sheet = page.locator('#character-sheet-root');
        for (const label of locale === 'ru'
            ? ['Обращение с животными', 'Вождение']
            : ['Animal Ken', 'Drive']) {
            const link = sheet.getByRole('link', {
                name: locale === 'ru' ? `Документация: ${label}` : `Documentation for ${label}`,
                exact: true,
            });
            await expect(link).toBeVisible();
            for (const width of [500, 240]) {
                const layout = await link.evaluate(async (markLink, rowWidth) => {
                    await document.fonts.ready;
                    const row = markLink.closest<HTMLElement>('.term-row-specialty')!;
                    row.style.width = `${rowWidth}px`;
                    const mark = markLink.parentElement!;
                    const term = mark.previousElementSibling!;
                    const caption = mark.parentElement!;
                    caption.style.maxWidth = rowWidth === 500 ? '145px' : '';
                    const text =
                        [...term.querySelectorAll('.term-full, .term-short')].find(
                            (node) => getComputedStyle(node).display !== 'none'
                        ) ?? term;
                    const range = document.createRange();
                    range.selectNodeContents(text);
                    const lines = [...range.getClientRects()].filter((rect) => rect.width > 0);
                    const last = lines.at(-1)!;
                    const box = mark.getBoundingClientRect();
                    const input = row.querySelector('input')!;
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d')!;
                    context.font = getComputedStyle(input).font;
                    return {
                        lines: lines.length,
                        gap: box.left - last.right,
                        top: box.top - last.top,
                        inputWidth: input.getBoundingClientRect().width,
                        minimum: context.measureText('00000000').width,
                    };
                }, width);
                if (locale === 'ru' && label === 'Обращение с животными' && width === 500) {
                    expect(layout.lines).toBeGreaterThan(1);
                }
                expect(layout.gap).toBeCloseTo(6, 0);
                expect(Math.abs(layout.top)).toBeLessThan(5);
                expect(layout.inputWidth).toBeGreaterThanOrEqual(layout.minimum);
            }
        }
    });
}
